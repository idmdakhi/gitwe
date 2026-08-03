import { ConflictError, ValidationError } from "../../domain/errors.js";
import type { ResolvedTopic } from "../../domain/entities.js";
import { expandMessage, type EngineContext } from "../context.js";
import type { OperationState } from "../interfaces/operation-state.js";

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
  updateMessage?: string;
  noVerify?: boolean;
  /** Push the updated base branches (and tags) when finished. */
  push?: boolean;
}

export interface FinishResult {
  branch: string;
  parent: string;
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
  private readonly topic: ResolvedTopic;
  private readonly options: FinishOptions;
  private readonly parent: string;
  private readonly result: FinishResult;
  private state: OperationState;

  constructor(
    ctx: EngineContext,
    topic: ResolvedTopic,
    options: FinishOptions,
    state?: OperationState,
  ) {
    this.ctx = ctx;
    this.topic = topic;
    this.options = options;
    this.parent = topic.type.parent;
    this.result = {
      branch: topic.branch,
      parent: this.parent,
      strategy: this.strategy(),
      updatedBranches: [],
      deletedLocal: false,
      deletedRemote: false,
      finalBranch: this.parent,
    };
    this.state = state ?? {
      version: 1,
      operation: "finish",
      branch: topic.branch,
      topicType: topic.type.name,
      options: { ...options } as Record<string, unknown>,
      stepIndex: 0,
      startedAt: new Date().toISOString(),
      snapshots: {},
      createdTags: [],
    };
  }

  private strategy(): "merge" | "squash" | "rebase" {
    if (this.options.squash === true) return "squash";
    if (this.options.rebase === true) return "rebase";
    return this.topic.type.upstreamStrategy;
  }

  private shouldTag(): boolean {
    return this.options.tag ?? this.topic.type.tag;
  }

  private tagName(): string {
    return (
      this.options.tagName ??
      `${this.ctx.workflow.tagPrefixOf(this.topic.type)}${this.topic.shortName}`
    );
  }

  private async snapshot(branch: string): Promise<void> {
    if (this.state.snapshots[branch] !== undefined) return;
    this.state.snapshots[branch] = await this.ctx.git.revParse(branch);
  }

  private steps(): Step[] {
    const { git, workflow, logger, hooks } = this.ctx;
    const topic = this.topic.branch;
    const parent = this.parent;
    const strategy = this.strategy();
    const remote = workflow.remote;
    const children = workflow
      .childrenOf(parent)
      .filter((child) => child.autoUpdate)
      .map((child) => child.name);

    const steps: Step[] = [
      {
        name: "preflight",
        run: async () => {
          if (!(await git.branchExists(topic))) {
            throw new ValidationError(`branch "${topic}" does not exist`);
          }
          if (!(await git.branchExists(parent))) {
            throw new ValidationError(`base branch "${parent}" does not exist`);
          }
          if (!(await git.isClean())) {
            throw new ValidationError(
              "the working tree has uncommitted changes",
              "commit or stash them before finishing",
            );
          }
          this.state.originalBranch = (await git.currentBranch()) ?? parent;
          await this.snapshot(parent);
          await hooks.run("pre-finish", { branch: topic, topicType: this.topic.type.name, parent });
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
          if (!(await git.remoteBranchExists(remote, topic))) return;
          const { behind } = await git.aheadBehind(topic, `${remote}/${topic}`);
          if (behind > 0) {
            throw new ValidationError(
              `"${topic}" is ${behind} commit(s) behind ${remote}/${topic}`,
              "pull the remote changes first, or pass --force",
            );
          }
        },
      },
      {
        name: "rebase-topic",
        run: async () => {
          if (strategy !== "rebase") return;
          if (await git.isAncestor(parent, topic)) return;
          await git.checkout(topic);
          await git.rebase(parent);
        },
      },
      {
        name: "merge-into-parent",
        run: async () => {
          if (await git.isAncestor(topic, parent)) return;
          await this.snapshot(parent);
          await git.checkout(parent);
          if (strategy === "squash") {
            if (!(await git.hasStagedChanges())) {
              await git.merge(topic, { squash: true, noVerify: this.options.noVerify });
            }
            const message =
              this.options.squashMessage ?? expandMessage("%b", { branch: topic, parent });
            await git.commit(message, { noVerify: this.options.noVerify });
          } else {
            const template = this.options.mergeMessage ?? `Merge branch '%b' into %p`;
            await git.merge(topic, {
              noFf: this.options.noFf ?? strategy !== "rebase",
              message: expandMessage(template, { branch: topic, parent }),
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
          if (!(await git.branchExists(child))) return;
          if (await git.isAncestor(parent, child)) {
            this.result.finalBranch = child;
            return;
          }
          await this.snapshot(child);
          await git.checkout(child);
          const base = workflow.requireBase(child);
          if (base.downstreamStrategy === "rebase") {
            await git.rebase(parent);
          } else {
            const template = this.options.updateMessage ?? `Merge branch '%p' into %b`;
            await git.merge(parent, {
              noFf: true,
              message: expandMessage(template, { branch: child, parent }),
              noVerify: this.options.noVerify,
            });
          }
          this.result.updatedBranches.push(child);
          this.result.finalBranch = child;
        },
      });
    }

    steps.push(
      {
        name: "push",
        run: async () => {
          if (this.options.push !== true) return;
          if (!(await git.remoteExists(remote))) return;
          await git.push(remote, parent, { followTags: this.shouldTag() });
          for (const child of this.result.updatedBranches) {
            await git.push(remote, child);
          }
        },
      },
      {
        name: "delete-remote-branch",
        run: async () => {
          if (this.options.keep === true || this.options.keepRemote === true) return;
          if (!this.topic.type.deleteOnFinish) return;
          if (!(await git.remoteExists(remote))) return;
          if (!(await git.remoteBranchExists(remote, topic))) return;
          await git.push(remote, topic, { delete: true });
          this.result.deletedRemote = true;
        },
      },
      {
        name: "delete-local-branch",
        run: async () => {
          if (this.options.keep === true) return;
          if (!this.topic.type.deleteOnFinish) return;
          if (!(await git.branchExists(topic))) return;
          const current = await git.currentBranch();
          if (current === topic) await git.checkout(parent);
          const force = this.options.forceDelete === true || strategy === "squash";
          await git.deleteBranch(topic, force);
          this.result.deletedLocal = true;
        },
      },
      {
        name: "checkout-final-branch",
        run: async () => {
          const target = (await git.branchExists(this.result.finalBranch))
            ? this.result.finalBranch
            : parent;
          if ((await git.currentBranch()) !== target) await git.checkout(target);
          this.result.finalBranch = target;
          await hooks.run("post-finish", {
            branch: topic,
            topicType: this.topic.type.name,
            parent,
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
