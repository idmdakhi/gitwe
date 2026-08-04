import { ConflictError, ValidationError } from "../../domain/errors.js";
import type { BaseBranch, ResolvedBranch } from "../../domain/entities.js";
import { expandMessage, type EngineContext } from "../context.js";
import type { OperationState } from "../interfaces/operation-state.js";
import type { MergeStrategy } from "../../domain/entities.js";

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
  base: string;
  strategy: "merge" | "squash" | "rebase";
  tag?: string;
  updatedBranches: string[];
  deletedLocal: boolean;
  deletedRemote: boolean;
  finalBranch: string;
}

interface Step {
  name: string;
  run: () => Promise<void>;
}

/** Executes the finish state machine and persists progress for --continue/--abort. */
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
    this.result = {
      branch: resolved.branch,
      base: this.targets[0] ?? ctx.workflow.rootBranch.name,
      strategy: this.strategy,
      updatedBranches: [],
      deletedLocal: false,
      deletedRemote: false,
      finalBranch: this.targets[0] ?? ctx.workflow.rootBranch.name,
    };
    this.state = state ?? {
      version: 1,
      operation: "finish",
      branch: resolved.branch,
      branchType: resolved.type.name,
      options: { ...options } as Record<string, unknown>,
      stepIndex: 0,
      startedAt: new Date().toISOString(),
      snapshots: {},
      createdTags: [],
    };
  }

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
    if (this.state.snapshots[branch] !== undefined) return;
    this.state.snapshots[branch] = await this.ctx.git.revParse(branch);
  }

  private steps(): Step[] {
    const { git, workflow, logger, hooks } = this.ctx;
    const branch = this.resolved.branch;
    const base = this.targets[0] ?? this.ctx.workflow.rootBranch.name;
    const strategy = this.strategy;
    const remote = workflow.remoteName;
    const targets = this.targets;
    const children: BaseBranch[] = [];
    for (const target of targets) {
      for (const child of workflow.childrenOf(target)) {
        children.push(child);
      }
    }
    const steps: Step[] = [
      {
        name: "preflight",
        run: async () => {
          if (!(await git.branchExists(branch))) {
            throw new ValidationError(`branch "${branch}" does not exist`);
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
          this.state.originalBranch = (await git.currentBranch()) ?? targets[0];
          for (const target of targets) {
            await this.snapshot(target);
          }
          await hooks.run("pre-finish", {
            branch: branch,
            branchType: this.resolved.type.name,
            parent: targets.join(","),
          });
        },
      },
      {
        name: "fetch",
        run: async () => {
          if (this.options.fetch === false) return;
          if (!(await git.remoteExists(remote))) return;
          await git.fetch(remote);
        },
      },
      {
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
      },
      {
        name: "rebase-branch",
        run: async () => {
          if (strategy !== "rebase") return;
          if (await git.isAncestor(base, branch)) return;
          await git.checkout(branch);
          await git.rebase(base);
        },
      },
      {
        name: "merge-into-parent",
        run: async () => {
          if (await git.isAncestor(branch, base)) return;
          await this.snapshot(base);
          await git.checkout(base);
          if (strategy === "squash") {
            if (!(await git.hasStagedChanges())) {
              await git.merge(branch, { squash: true, noVerify: this.options.noVerify });
            }
            const message =
              this.options.squashMessage ?? expandMessage("%b", { branch: branch, base });
            await git.commit(message, { noVerify: this.options.noVerify });
          } else {
            const template = this.options.mergeMessage ?? `Merge branch '%b' into %p`;
            await git.merge(branch, {
              noFf: this.options.noFf ?? strategy !== "rebase",
              message: expandMessage(template, { branch: branch, base }),
              noVerify: this.options.noVerify,
            });
          }
        },
      },
      {
        name: "tag",
        run: async () => {
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
            // ref: "HEAD",
          });
          this.state.createdTags.push(name);
          this.result.tag = name;
        },
      },
    ];

    for (const child of children) {
      steps.push({
        name: `update-${child}`,
        run: async () => {
          const childName = child.name; // ذخیره نام child
          if (!(await git.branchExists(childName))) return;
          const childBase = workflow.requireBase(childName);
          const baseBranch = childBase.base!; // چون child یک BaseBranch است، اما workflow.requireBase برمی‌گرداند
          if (await git.isAncestor(baseBranch, childName)) {
            this.result.finalBranch = childName;
            return;
          }
          await this.snapshot(childName);
          await git.checkout(childName);
          // استراتژی به‌روزرسانی را از childBase بگیرید
          if (workflow.mergeStrategyFor(childName) === "rebase") {
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

    steps.push(
      {
        name: "push",
        run: async () => {
          if (this.options.push !== true) return;
          if (!(await git.remoteExists(remote))) return;
          await git.push(remote, base, { followTags: this.shouldTag() });
          for (const child of this.result.updatedBranches) {
            await git.push(remote, child);
          }
        },
      },
      {
        name: "delete-remote-branch",
        run: async () => {
          if (this.options.keep === true || this.options.keepRemote === true) return;
          if (!this.ctx.workflow.shouldDeleteOnFinish(this.resolved.type)) return;
          if (!(await git.remoteExists(remote))) return;
          if (!(await git.remoteBranchExists(remote, branch))) return;
          await git.push(remote, branch, { delete: true });
          this.result.deletedRemote = true;
        },
      },
      {
        name: "delete-local-branch",
        run: async () => {
          if (this.options.keep === true) return;
          if (!this.ctx.workflow.shouldDeleteOnFinish(this.resolved.type)) return;
          if (!(await git.branchExists(branch))) return;
          const current = await git.currentBranch();
          if (current === branch) await git.checkout(base);
          const force = this.options.forceDelete === true || strategy === "squash";
          await git.deleteBranch(branch, force);
          this.result.deletedLocal = true;
        },
      },
      {
        name: "checkout-final-branch",
        run: async () => {
          const target = (await git.branchExists(this.result.finalBranch))
            ? this.result.finalBranch
            : base;
          if ((await git.currentBranch()) !== target) await git.checkout(target);
          this.result.finalBranch = target;
          await hooks.run("post-finish", {
            branch: branch,
            branchType: this.resolved.type.name,
            base,
          });
        },
      },
    );

    return steps;
  }

  /** Run every remaining step, persisting progress before each one. */
  async execute(): Promise<FinishResult> {
    const steps = this.steps();
    for (let index = this.state.stepIndex; index < steps.length; index += 1) {
      const step = steps[index];
      this.state.stepIndex = index;
      this.ctx.state.write(this.state);
      this.ctx.logger.debug(`finish: ${step.name}`);
      try {
        await step.run();
      } catch (error) {
        if (error instanceof ConflictError) {
          this.state.stepIndex = index;
          this.ctx.state.write(this.state);
        } else {
          this.ctx.state.clear();
        }
        throw error;
      }
    }
    this.ctx.state.clear();
    return this.result;
  }
}
