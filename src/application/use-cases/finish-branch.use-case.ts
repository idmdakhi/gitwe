import { ConflictError, OperationInProgressError, ValidationError } from "../../domain/errors/index.js";
import type { WorkflowService } from "../../domain/services/workflow.service.js";
import { VersionCalculatorService } from "../../domain/services/version-calculator.service.js";
import type { GitRepository } from "../../domain/ports/git-repository.port.js";
import type { HookRunner } from "../../domain/ports/hook-runner.port.js";
import type { Logger } from "../../domain/ports/logger.port.js";
import type { OperationState, OperationStateStore } from "../../domain/ports/operation-state-store.port.js";

export interface FinishBranchInput {
  readonly branch: string;
  readonly squash?: boolean;
  readonly push?: boolean;
  readonly currentVersion?: string;
}

export type FinishAction =
  | { readonly kind: "continue" }
  | { readonly kind: "abort" }
  | ({ readonly kind: "start" } & FinishBranchInput);

export interface FinishResult {
  readonly branch: string;
  readonly mergedInto: readonly string[];
  readonly tag?: string;
  readonly deleted: boolean;
}

interface FinishStateData {
  readonly branch: string;
  readonly typeName: string;
  readonly targets: readonly string[];
  readonly mergedInto: string[];
  readonly squash: boolean;
  readonly push: boolean;
  readonly tag?: string;
  readonly currentVersion?: string;
}

const OPERATION = "finish";

/**
 * Merges a topic branch into every configured target, tags it if the
 * workflow requires it, then deletes it. Modeled as an explicit,
 * resumable state machine: if a merge conflict stops the process, the
 * remaining steps are persisted via {@link OperationStateStore} and
 * can be resumed with `{ kind: "continue" }` or cancelled with
 * `{ kind: "abort" }` — even from a brand-new process.
 */
export class FinishBranchUseCase {
  private readonly versions = new VersionCalculatorService();

  constructor(
    private readonly workflow: WorkflowService,
    private readonly git: GitRepository,
    private readonly hooks: HookRunner,
    private readonly logger: Logger,
    private readonly stateStore: OperationStateStore,
  ) {}

  async execute(action: FinishAction): Promise<FinishResult> {
    if (action.kind === "abort") return this.abort();
    if (action.kind === "continue") return this.resume();
    return this.start(action);
  }

  // ---- entry points --------------------------------------------------------

  private async start(input: FinishBranchInput): Promise<FinishResult> {
    if (await this.stateStore.exists()) {
      throw new OperationInProgressError(OPERATION);
    }

    const resolved = this.workflow.resolveBranch(input.branch);
    if (!resolved) {
      throw new ValidationError(`"${input.branch}" is not a recognised topic branch`);
    }
    if (!(await this.git.branchExists(resolved.branch))) {
      throw new ValidationError(`branch "${resolved.branch}" does not exist`);
    }

    const state: FinishStateData = {
      branch: resolved.branch,
      typeName: resolved.type.name,
      targets: resolved.type.target,
      mergedInto: [],
      squash: input.squash ?? this.workflow.allowsSquash(resolved.type),
      push: input.push ?? false,
      ...(input.currentVersion ? { currentVersion: input.currentVersion } : {}),
    };

    await this.hooks.run("pre-finish", { branch: state.branch, branchType: state.typeName });
    return this.runFrom(state);
  }

  private async resume(): Promise<FinishResult> {
    const persisted = await this.stateStore.read();
    if (!persisted || persisted.operation !== OPERATION) {
      throw new ValidationError("no finish operation is in progress");
    }
    if (await this.git.mergeInProgress()) {
      const conflicts = await this.git.conflictedFiles();
      if (conflicts.length > 0) {
        throw new ConflictError(`${conflicts.length} file(s) still have unresolved conflicts`, conflicts);
      }
      const target = persisted.data["pendingTarget"] as string;
      await this.git.continueMerge();
      this.logger.info(`resumed merge into ${target}`);
    }
    return this.runFrom(persisted.data as unknown as FinishStateData, persisted.completedSteps);
  }

  private async abort(): Promise<FinishResult> {
    if (await this.git.mergeInProgress()) {
      await this.git.abortMerge();
    }
    await this.stateStore.clear();
    return { branch: "", mergedInto: [], deleted: false };
  }

  // ---- state machine --------------------------------------------------------

  private async runFrom(state: FinishStateData, completed: readonly string[] = []): Promise<FinishResult> {
    const done = new Set(completed);
    const type = this.workflow.requireBranchType(state.typeName);

    for (const target of state.targets) {
      const step = `merge:${target}`;
      if (done.has(step)) continue;

      await this.git.checkout(target);
      try {
        await this.git.merge(state.branch, {
          noFastForward: !state.squash,
          squash: state.squash,
          message: `Merge ${state.branch} into ${target}`,
        });
      } catch {
        if (await this.git.mergeInProgress()) {
          await this.persist(state, [...done], step, target);
          const conflicts = await this.git.conflictedFiles();
          throw new ConflictError(
            `conflict merging ${state.branch} into ${target}`,
            conflicts,
          );
        }
        throw new ConflictError(`failed to merge ${state.branch} into ${target}`);
      }

      state.mergedInto.push(target);
      done.add(step);
    }

    if (this.workflow.shouldTag(type) && !done.has("tag")) {
      const bump = this.workflow.versionBumpFor(type);
      if (state.currentVersion && bump !== "none") {
        const next = this.versions.bump(state.currentVersion, bump);
        const tagName = this.versions.format(next, this.workflow.tagPrefix());
        if (!(await this.git.tagExists(tagName))) {
          await this.git.createTag(tagName, { message: `Release ${tagName}` });
        }
        (state as { tag?: string }).tag = tagName;
      }
      done.add("tag");
    }

    if (state.push && !done.has("push")) {
      for (const remote of this.workflow.pushRemotesFor(type)) {
        for (const target of state.targets) {
          await this.git.push(remote, target, { followTags: true });
        }
      }
      done.add("push");
    }

    let deleted = false;
    if (this.workflow.shouldDeleteOnFinish(type) && !done.has("delete")) {
      await this.git.deleteBranch(state.branch, true);
      deleted = true;
      done.add("delete");
    }

    await this.stateStore.clear();
    await this.hooks.run("post-finish", { branch: state.branch, branchType: type.name });

    return {
      branch: state.branch,
      mergedInto: state.mergedInto,
      ...(state.tag ? { tag: state.tag } : {}),
      deleted,
    };
  }

  private async persist(
    state: FinishStateData,
    completedSteps: string[],
    currentStep: string,
    pendingTarget: string,
  ): Promise<void> {
    const record: OperationState = {
      operation: OPERATION,
      currentStep,
      completedSteps,
      data: { ...state, pendingTarget },
      startedAt: new Date().toISOString(),
    };
    await this.stateStore.write(record);
  }
}
