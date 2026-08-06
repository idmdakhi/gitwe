// src/application/use-case/finish.ts

import { ConflictError, ValidationError } from "../../domain/errors.js";
import type { BaseBranch, ResolvedBranch, MergeStrategy } from "../../domain/entities.js";
import { expandMessage, type EngineContext } from "../context.js";
import type { OperationState } from "../interfaces/operation-state.js";

// ============================================================================
//  Types
// ============================================================================

export interface FinishOptions {
  /** Fetch the remote before finishing (default: true when a remote exists). */
  fetch?: boolean;
  /** Skip the remote sync check and allow finishing non-standard branches. */
  force?: boolean;
  keep?: boolean;
  keepRemote?: boolean;
  forceDelete?: boolean;
  tag?: boolean;
  tagName?: string;
  message?: string;
  sign?: boolean;
  signingKey?: string;
  squash?: boolean;
  rebase?: boolean;
  noFf?: boolean;
  mergeMessage?: string;
  squashMessage?: string;
  noVerify?: boolean;
  /** Push the updated base branches (and tags) when finished. */
  push?: boolean;
  updateMessage?: string;
}

export interface FinishResult {
  branch: string;
  /** The branch this topic was merged into. */
  base: string;
  strategy: "merge" | "squash" | "rebase";
  tag?: string;
  updatedBranches: string[];
  deletedLocal: boolean;
  deletedRemote: boolean;
  finalBranch: string;
}

// ============================================================================
//  Internal Step Interface
// ============================================================================

interface Step {
  name: string;
  run: () => Promise<void>;
}

// ============================================================================
//  FinishOperation Class
// ============================================================================

/**
 * Executes the finish state machine and persists progress for --continue/--abort.
 *
 * @deprecated This class is being replaced by the Workflow-based implementation
 * in `src/application/workflows/finish-workflow.ts`. It is kept for backward
 * compatibility with existing tests and will be removed in a future version.
 */
export class FinishOperation {
  private readonly ctx: EngineContext;
  private readonly resolved: ResolvedBranch;
  private readonly options: FinishOptions;
  private readonly targets: string[];
  private readonly strategy: MergeStrategy;
  private readonly result: FinishResult;
  private state: OperationState;

  constructor(
    ctx: EngineContext,
    resolved: ResolvedBranch,
    options: FinishOptions,
    state?: OperationState,
  ) {
    this.ctx = ctx;
    this.resolved = resolved;
    this.options = options;
    this.targets = resolved.type.target;
    this.strategy = options.squash
      ? "squash"
      : options.rebase
        ? "rebase"
        : ctx.workflow.mergeStrategyFor(resolved.type);

    const fallbackBase = this.targets[0] ?? resolved.type.base;

    this.result = {
      branch: resolved.branch,
      base: fallbackBase,
      strategy: this.strategy,
      updatedBranches: [],
      deletedLocal: false,
      deletedRemote: false,
      finalBranch: fallbackBase,
    };

    // اگر state داده نشده، یک state جدید با ساختار جدید بساز
    if (state) {
      this.state = state;
    } else {
      this.state = {
        version: 1,
        operation: "finish",
        currentStep: "",
        completedSteps: [],
        data: {
          branch: resolved.branch,
          branchType: resolved.type.name,
          options: { ...options },
          strategy: this.strategy,
          targets: this.targets,
          snapshots: {},
          createdTags: [],
          originalBranch: undefined,
        },
        startedAt: new Date().toISOString(),
      };
    }
  }

  // ==========================================================================
  //  Private Helpers
  // ==========================================================================

  private shouldTag(): boolean {
    return this.options.tag ?? this.ctx.workflow.shouldTag(this.resolved.type);
  }

  private tagName(): string {
    return (
      this.options.tagName ??
      `${this.ctx.workflow.tagPrefixFor(this.resolved.type)}${this.resolved.shortName}`
    );
  }

  private async snapshot(branch: string): Promise<void> {
    const snapshots = (this.state.data.snapshots as Record<string, string>) || {};
    if (snapshots[branch] !== undefined) return;
    snapshots[branch] = await this.ctx.git.revParse(branch);
    this.state.data.snapshots = snapshots;
  }

  // ==========================================================================
  //  Build Steps
  // ==========================================================================

  private steps(): Step[] {
    const { git, workflow, logger, hooks } = this.ctx;
    const branch = this.resolved.branch;
    const targets = this.targets;
    const hasTarget = targets.length > 0;
    const base = targets[0] ?? this.resolved.type.base;
    const strategy = this.strategy;
    const remote = workflow.remoteName;

    // پیدا کردن فرزندانی که باید به‌روز شوند
    const children: BaseBranch[] = [];
    for (const target of targets) {
      for (const child of workflow.childrenOf(target)) {
        children.push(child);
      }
    }

    const steps: Step[] = [];

    // ===== 1. Preflight =====
    steps.push({
      name: "preflight",
      run: async () => {
        if (!(await git.branchExists(branch))) {
          throw new ValidationError(`branch "${branch}" does not exist`);
        }

        if (!hasTarget) {
          logger.warn(
            `branch type "${this.resolved.type.name}" has no target; no merge will be performed`,
          );
          return;
        }

        for (const target of targets) {
          if (!(await git.branchExists(target))) {
            throw new ValidationError(`base branch "${target}" does not exist`);
          }
        }

        if (!(await git.isClean())) {
          throw new ValidationError(
            "the working tree has uncommitted changes",
            "commit or stash them before finishing",
          );
        }

        this.state.data.originalBranch = (await git.currentBranch()) ?? targets[0];

        for (const target of targets) {
          await this.snapshot(target);
        }

        await hooks.run("pre-finish", {
          branch,
          branchType: this.resolved.type.name,
          parent: targets.join(","),
        });
      },
    });

    // ===== 2. Fetch =====
    steps.push({
      name: "fetch",
      run: async () => {
        if (this.options.fetch === false) return;
        if (!(await git.remoteExists(remote))) return;
        await git.fetch(remote);
      },
    });

    // ===== 3. Remote Sync Check =====
    steps.push({
      name: "remote-sync-check",
      run: async () => {
        if (this.options.force === true) return;
        if (!(await git.remoteBranchExists(remote, branch))) return;
        const { behind } = await git.aheadBehind(branch, `${remote}/${branch}`);
        if (behind > 0) {
          throw new ValidationError(
            `"${branch}" is ${behind} commit(s) behind ${remote}/${branch}`,
            "pull the remote changes first, or pass --force",
          );
        }
      },
    });

    // ===== 4. Rebase (if needed) =====
    steps.push({
      name: "rebase-branch",
      run: async () => {
        if (!hasTarget) return;
        if (strategy !== "rebase") return;
        if (await git.isAncestor(base, branch)) return;
        await git.checkout(branch);
        await git.rebase(base);
      },
    });

    // ===== 5. Merge into Base =====
    steps.push({
      name: "merge-into-base",
      run: async () => {
        if (!hasTarget) {
          logger.info(`skipping merge because "${this.resolved.type.name}" has no target`);
          return;
        }

        if (await git.isAncestor(branch, base)) return;

        await this.snapshot(base);
        await git.checkout(base);

        if (strategy === "squash") {
          if (!(await git.hasStagedChanges())) {
            await git.merge(branch, { squash: true, noVerify: this.options.noVerify });
          }
          const message = this.options.squashMessage ?? expandMessage("%b", { branch, base });
          await git.commit(message, { noVerify: this.options.noVerify });
        } else {
          const template = this.options.mergeMessage ?? `Merge branch '%b' into %p`;
          await git.merge(branch, {
            noFf: this.options.noFf ?? strategy !== "rebase",
            message: expandMessage(template, { branch, base }),
            noVerify: this.options.noVerify,
          });
        }
      },
    });

    // ===== 6. Tag =====
    steps.push({
      name: "tag",
      run: async () => {
        if (!hasTarget) return;
        if (!this.shouldTag()) return;

        const name = this.tagName();
        if ((await git.tags()).includes(name)) {
          logger.debug(`tag ${name} already exists`);
          this.result.tag = name;
          return;
        }

        await git.createTag(name, {
          message: this.options.message ?? name,
          sign: this.options.sign,
          signingKey: this.options.signingKey,
        });

        const createdTags = (this.state.data.createdTags as string[]) || [];
        createdTags.push(name);
        this.state.data.createdTags = createdTags;
        this.result.tag = name;
      },
    });

    // ===== 7. Update Children =====
    for (const child of children) {
      steps.push({
        name: `update-${child.name}`,
        run: async () => {
          if (!hasTarget) return;

          const childName = child.name;
          if (!(await git.branchExists(childName))) return;

          const childBase = workflow.requireBase(childName);
          const baseBranch = childBase.base!;

          if (await git.isAncestor(baseBranch, childName)) {
            this.result.finalBranch = childName;
            return;
          }

          await this.snapshot(childName);
          await git.checkout(childName);

          if (workflow.mergeStrategyFor(this.resolved.type) === "rebase") {
            await git.rebase(baseBranch);
          } else {
            const template = this.options.updateMessage ?? `Merge branch '%p' into %b`;
            await git.merge(baseBranch, {
              noFf: true,
              message: expandMessage(template, { branch: childName, base: baseBranch }),
              noVerify: this.options.noVerify,
            });
          }

          this.result.updatedBranches.push(childName);
          this.result.finalBranch = childName;
        },
      });
    }

    // ===== 8. Push =====
    steps.push({
      name: "push",
      run: async () => {
        if (this.options.push !== true) return;
        if (!(await git.remoteExists(remote))) return;

        if (!hasTarget) {
          const current = (await git.currentBranch()) as string;
          await git.push(remote, current);
          return;
        }

        if (hasTarget) {
          await git.push(remote, base, { followTags: this.shouldTag() });
        } else if (this.shouldTag()) {
          await git.push(remote, branch, { followTags: true });
        }

        for (const child of this.result.updatedBranches) {
          await git.push(remote, child);
        }
      },
    });

    // ===== 9. Delete Remote Branch =====
    steps.push({
      name: "delete-remote-branch",
      run: async () => {
        if (!hasTarget) return;
        if (this.options.keep === true || this.options.keepRemote === true) return;
        if (!this.ctx.workflow.shouldDeleteOnFinish(this.resolved.type)) return;
        if (!(await git.remoteExists(remote))) return;
        if (!(await git.remoteBranchExists(remote, branch))) return;

        await git.push(remote, branch, { delete: true });
        this.result.deletedRemote = true;
      },
    });

    // ===== 10. Delete Local Branch =====
    steps.push({
      name: "delete-local-branch",
      run: async () => {
        if (!hasTarget) return;
        if (this.options.keep === true) return;
        if (!this.ctx.workflow.shouldDeleteOnFinish(this.resolved.type)) return;
        if (!(await git.branchExists(branch))) return;

        const current = await git.currentBranch();
        if (current === branch) await git.checkout(base);

        const force = this.options.forceDelete === true || strategy === "squash";
        await git.deleteBranch(branch, force);
        this.result.deletedLocal = true;
      },
    });

    // ===== 11. Checkout Final Branch =====
    steps.push({
      name: "checkout-final-branch",
      run: async () => {
        if (!hasTarget) return;

        const target = (await git.branchExists(this.result.finalBranch))
          ? this.result.finalBranch
          : base;

        if ((await git.currentBranch()) !== target) {
          await git.checkout(target);
        }

        this.result.finalBranch = target;

        await hooks.run("post-finish", {
          branch,
          branchType: this.resolved.type.name,
          base,
        });
      },
    });

    return steps;
  }

  // ==========================================================================
  //  Execute
  // ==========================================================================

  /**
   * Run every remaining step, persisting progress before each one.
   */
  async execute(): Promise<FinishResult> {
    const steps = this.steps();
    const stepNames = steps.map((s) => s.name);

    // پیدا کردن مرحله‌ای که باید از آن شروع کنیم
    let startIndex = 0;
    if (this.state.completedSteps.length > 0) {
      const lastCompleted = this.state.completedSteps[this.state.completedSteps.length - 1];
      const idx = stepNames.indexOf(lastCompleted);
      if (idx !== -1) startIndex = idx + 1;
    }

    for (let i = startIndex; i < steps.length; i++) {
      const step = steps[i];

      this.state.currentStep = step.name;
      await this.ctx.state.write(this.state);
      this.ctx.logger.debug(`finish: ${step.name}`);

      try {
        await step.run();
        this.state.completedSteps.push(step.name);
        await this.ctx.state.write(this.state);
      } catch (error) {
        if (error instanceof ConflictError) {
          // Conflict: state را نگه دار
          this.state.currentStep = step.name;
          await this.ctx.state.write(this.state);
        } else {
          // سایر خطاها: state را پاک کن
          await this.ctx.state.clear();
        }
        throw error;
      }
    }

    // همه مراحل با موفقیت انجام شد
    await this.ctx.state.clear();
    return this.result;
  }
}
