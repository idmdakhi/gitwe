import {
  ConflictError,
  GitCommandError,
  OperationInProgressError,
  ValidationError,
} from "../../domain/errors/index.js";
import type { WorkflowService } from "../../domain/services/workflow.service.js";
import { VersionCalculatorService } from "../../domain/services/version-calculator.service.js";
import type { GitRepository, TagOptions } from "../../domain/ports/git-repository.port.js";
import type { HookRunner } from "../../domain/ports/hook-runner.port.js";
import type { Logger } from "../../domain/ports/logger.port.js";
import type {
  OperationState,
  OperationStateStore,
} from "../../domain/ports/operation-state-store.port.js";
import { omitUndefined } from "../../utils.js";

export interface FinishBranchInput {
  readonly branch: string;
  readonly squash?: boolean;
  readonly push?: boolean;
  readonly currentVersion?: string;
  // جدید
  readonly rebase?: boolean;
  readonly noFF?: boolean;
  readonly mergeMessage?: string;
  readonly squashMessage?: string;
  readonly tag?: boolean;
  readonly noTag?: boolean;
  readonly tagname?: string;
  readonly tagMessage?: string;
  readonly signTag?: boolean;
  readonly signingKey?: string;
  readonly keep?: boolean;
  readonly keepRemote?: boolean;
  readonly forceDelete?: boolean;
  readonly force?: boolean;
  readonly fetch?: boolean;
  readonly bump?: "major" | "minor" | "patch";
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
  readonly tag?: string | undefined;
  readonly currentVersion?: string | undefined;
  readonly rebase: boolean;
  readonly noFF: boolean;
  readonly mergeMessage?: string | undefined;
  readonly squashMessage?: string | undefined;
  readonly tagOverride?: boolean | undefined; // true = create, false = skip
  readonly noTag?: boolean | undefined;
  readonly tagname?: string | undefined;
  readonly tagMessage?: string | undefined;
  readonly signTag?: boolean | undefined;
  readonly signingKey?: string | undefined;
  readonly keep: boolean; // true = keep local branch
  readonly keepRemote: boolean; // true = keep remote branch
  readonly forceDelete: boolean;
  readonly force: boolean; // skip remote sync check
  readonly fetch: boolean; // fetch before finishing
  readonly bump?: "major" | "minor" | "patch" | undefined;
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

    // تعیین مقادیر پیش‌فرض
    const squash = input.squash ?? this.workflow.allowsSquash(resolved.type);
    const rebase = input.rebase ?? false;
    const noFF = input.noFF ?? false;
    const mergeMessage = input.mergeMessage;
    const squashMessage = input.squashMessage;
    const tagOverride = input.tag;
    const noTag = input.noTag ?? false;
    const tagname = input.tagname;
    const tagMessage = input.tagMessage;
    const signTag = input.signTag ?? false;
    const signingKey = input.signingKey;
    const keep = input.keep ?? !this.workflow.shouldDeleteOnFinish(resolved.type);
    const keepRemote = input.keepRemote ?? true; // default: keep remote branch
    const forceDelete = input.forceDelete ?? false;
    const force = input.force ?? false;
    const fetch = input.fetch ?? true; // default: fetch
    const bump = input.bump;

    const state: FinishStateData = {
      branch: resolved.branch,
      typeName: resolved.type.name,
      targets: resolved.type.target,
      mergedInto: [],
      squash,
      push: input.push ?? false,
      currentVersion: input.currentVersion,
      rebase,
      noFF,
      mergeMessage,
      squashMessage,
      tagOverride,
      noTag,
      tagname,
      tagMessage,
      signTag,
      signingKey,
      keep,
      keepRemote,
      forceDelete,
      force,
      fetch,
      bump,
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
        throw new ConflictError(
          `${conflicts.length} file(s) still have unresolved conflicts`,
          conflicts,
        );
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
  private async runFrom(
    state: FinishStateData,
    completed: readonly string[] = [],
  ): Promise<FinishResult> {
    const done = new Set(completed);
    const type = this.workflow.requireBranchType(state.typeName);

    // ---- Fetch (if enabled) ------------------------------------------------
    if (state.fetch && !done.has("fetch")) {
      for (const remote of this.workflow.fetchRemotes()) {
        await this.git.fetch(remote);
      }
      done.add("fetch");
    }

    // ---- Remote sync check (unless --force) --------------------------------
    if (!state.force && !done.has("remote-sync")) {
      const upstream = await this.git.upstreamOf(state.branch);
      if (upstream) {
        const { behind } = await this.git.aheadBehind(state.branch, upstream);
        if (behind > 0) {
          throw new GitCommandError(
            `Topic branch "${state.branch}" is behind its remote (${upstream}) by ${behind} commit(s).`,
            `Run 'git pull --rebase' first, or use --force to skip this check.`,
          );
        }
      }
      done.add("remote-sync");
    }

    // ---- Rebase if requested ----------------------------------------------
    if (state.rebase && !done.has("rebase")) {
      const parent = type.base;
      await this.git.checkout(state.branch);
      await this.git.rebase(parent);
      done.add("rebase");
    }

    // ---- Merge into targets ------------------------------------------------
    for (const target of state.targets) {
      const step = `merge:${target}`;
      if (done.has(step)) continue;

      await this.git.checkout(target);
      try {
        const mergeOptions: any = {
          noFastForward: state.noFF,
          squash: state.squash,
        };
        if (state.squash && state.squashMessage) {
          mergeOptions.message = state.squashMessage;
        } else if (state.mergeMessage) {
          let msg = state.mergeMessage.replace(/%b/g, state.branch).replace(/%p/g, target);
          mergeOptions.message = msg;
        }
        await this.git.merge(state.branch, mergeOptions);
      } catch {
        if (await this.git.mergeInProgress()) {
          await this.persist(state, [...done], step, target);
          const conflicts = await this.git.conflictedFiles();
          throw new ConflictError(`conflict merging ${state.branch} into ${target}`, conflicts);
        }
        throw new ConflictError(`failed to merge ${state.branch} into ${target}`);
      }

      state.mergedInto.push(target);
      done.add(step);
    }

    // ---- Tagging ----------------------------------------------------------
    const shouldTag =
      state.tagOverride !== undefined
        ? state.tagOverride
        : !state.noTag && this.workflow.shouldTag(type);

    if (shouldTag && !done.has("tag")) {
      let tagName: string;
      if (state.tagname) {
        tagName = state.tagname;
      } else {
        const bump = state.bump ?? this.workflow.versionBumpFor(type);
        if (state.currentVersion && bump !== "none") {
          const next = this.versions.bump(state.currentVersion, bump);
          tagName = this.versions.format(next, this.workflow.tagPrefix());
        } else {
          tagName = `${this.workflow.tagPrefix()}${Date.now()}`;
        }
      }
      if (!(await this.git.tagExists(tagName))) {
        await this.git.createTag(
          tagName,
          omitUndefined({
            annotated: true,
            message: state.tagMessage,
            sign: state.signTag,
            signingKey: state.signingKey,
          }) as TagOptions,
        );
      }
      (state as { tag?: string }).tag = tagName;
      done.add("tag");
    }

    // ---- Push (if requested) ----------------------------------------------
    if (state.push && !done.has("push")) {
      const remotes = this.workflow.pushRemotesFor(type);

      // Pre‑push validation: ensure each target is not behind its remote
      for (const remote of remotes) {
        for (const target of state.targets) {
          const upstream = await this.git.upstreamOf(target);
          if (upstream) {
            const { behind } = await this.git.aheadBehind(target, upstream);
            if (behind > 0) {
              throw new GitCommandError(
                `Cannot push ${target} because it is behind its remote (${upstream}) by ${behind} commit(s).`,
                `Run 'git pull --rebase ${remote} ${target}' first, or use --force if you are sure.`,
              );
            }
          }
        }
      }

      // Push each target to each configured remote
      for (const remote of remotes) {
        for (const target of state.targets) {
          try {
            await this.git.push(remote, target, { followTags: true });
          } catch (error) {
            if (error instanceof GitCommandError) {
              const msg = error.message.toLowerCase();
              if (msg.includes("non-fast-forward")) {
                throw new GitCommandError(
                  `Push to ${remote}/${target} was rejected because it is behind the remote.`,
                  `Run 'git pull --rebase ${remote} ${target}' to integrate remote changes, then try again.`,
                );
              }
              if (msg.includes("permission denied") || msg.includes("403")) {
                throw new GitCommandError(
                  `Permission denied when pushing to ${remote}/${target}.`,
                  `Check your credentials and push permissions for ${remote}.`,
                );
              }
              if (msg.includes("repository not found") || msg.includes("404")) {
                throw new GitCommandError(
                  `Remote repository ${remote} not found or you have no access.`,
                  `Verify the remote URL and your access rights.`,
                );
              }
            }
            throw error;
          }
        }
      }
      done.add("push");
    }

    // ---- Delete local branch ----------------------------------------------
    let deleted = false;
    if (!state.keep && !done.has("delete")) {
      const force = state.forceDelete || false;
      await this.git.deleteBranch(state.branch, force);
      deleted = true;
      done.add("delete");
    }

    // ---- Delete remote branch if requested --------------------------------
    if (!state.keepRemote && !done.has("delete-remote")) {
      for (const remote of this.workflow.pushRemotesFor(type)) {
        if (await this.git.remoteBranchExists(remote, state.branch)) {
          await this.git.deleteRemoteBranch(remote, state.branch);
        }
      }
      done.add("delete-remote");
    }

    // ---- Cleanup ----------------------------------------------------------
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
