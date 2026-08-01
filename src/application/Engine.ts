import { assertValidBranchName, globToRegExp } from "../domain/branchName.js";
import { OperationStateError, ValidationError } from "../domain/errors.js";
import type { Logger } from "./interfaces/Logger.js";
import { silentLogger } from "./interfaces/Logger.js";
import type { BranchStatus, ResolvedTopic, TopicType, WorkflowConfig } from "../domain/entities.js";
import { Workflow } from "../domain/workflow.js";
import type { GitRepository } from "./interfaces/GitRepository.js";
import type { EngineContext } from "./context.js";
import type { HookRunner } from "./interfaces/HookRunner.js";
import { FinishOperation, type FinishOptions, type FinishResult } from "./use-case/finish.js";
import type { OperationStateStore } from "./interfaces/OperationState.js";

export interface StartOptions {
  /** Explicit start point, overriding the topic type's configured one. */
  base?: string;
  fetch?: boolean;
}

export interface StartResult {
  branch: string;
  startPoint: string;
}

export interface UpdateOptions {
  rebase?: boolean;
  fetch?: boolean;
  noVerify?: boolean;
}

export interface UpdateResult {
  branch: string;
  parent: string;
  strategy: "merge" | "rebase";
  alreadyUpToDate: boolean;
}

export interface PublishOptions {
  pushOptions?: string[];
}

export interface DeleteOptions {
  force?: boolean;
  remote?: boolean;
}

export interface DeleteResult {
  branch: string;
  deletedRemote: boolean;
}

export interface OverviewReport {
  workflow: string;
  configPath?: string;
  currentBranch?: string;
  remote: string;
  baseBranches: Array<BranchStatus & { parent?: string; exists: boolean }>;
  topicTypes: Array<{ name: string; prefix: string; parent: string; branches: string[] }>;
  health: Array<{ level: "ok" | "warning" | "error"; message: string }>;
}

export interface EngineOptions {
  git: GitRepository;
  config: WorkflowConfig;
  root: string;
  logger?: Logger;
  configPath?: string;
  hooks: HookRunner;
  state: OperationStateStore;
}

/**
 * The workflow engine: every operation is expressed in terms of the workflow
 * definition, never hard-coded git-flow rules.
 */
export class Engine {
  readonly workflow: Workflow;
  readonly git: GitRepository;
  readonly root: string;
  readonly configPath?: string;
  private readonly ctx: EngineContext;

  constructor(options: EngineOptions) {
    const logger = options.logger ?? silentLogger;
    this.workflow = new Workflow(options.config);
    this.git = options.git;
    this.root = options.root;
    this.configPath = options.configPath;
    this.ctx = {
      git: options.git,
      workflow: this.workflow,
      root: options.root,
      logger,
      hooks: options.hooks,
      state: options.state,
    };
  }

  /** Create an engine for an existing repository at `root`. */
  static async create(options: {
    root: string;
    config: WorkflowConfig;
    logger?: Logger;
    configPath?: string;
    git: GitRepository;
    hooks: HookRunner;
    state: OperationStateStore;
  }): Promise<Engine> {
    return new Engine({
      git: options.git,
      config: options.config,
      root: options.root,
      logger: options.logger,
      configPath: options.configPath,
      hooks: options.hooks,
      state: options.state,
    });
  }

  get context(): EngineContext {
    return this.ctx;
  }

  /** Resolve a topic reference of a known type. */
  resolve(typeName: string, name: string): ResolvedTopic {
    return this.workflow.resolveTopic(this.workflow.requireTopicType(typeName), name);
  }

  /** Resolve the checked-out branch as a topic branch. */
  async currentTopic(): Promise<ResolvedTopic> {
    const branch = await this.git.currentBranch();
    if (branch === undefined) {
      throw new ValidationError("HEAD is detached; check out a topic branch first");
    }
    const topic = this.workflow.resolveBranch(branch);
    if (topic === undefined) {
      throw new ValidationError(
        `"${branch}" is not a topic branch of the "${this.workflow.config.name}" workflow`,
        `topic prefixes: ${this.workflow.topicTypes.map((t) => t.prefix).join(", ")}`,
      );
    }
    return topic;
  }

  /**
   * Resolve an optional reference: a name of `type`, a full branch name, or
   * the current branch when nothing is given.
   */
  async resolveTarget(type: TopicType | undefined, name?: string): Promise<ResolvedTopic> {
    if (name === undefined) {
      const topic = await this.currentTopic();
      if (type !== undefined && topic.type.name !== type.name) {
        throw new ValidationError(
          `the current branch is a ${topic.type.name} branch, not a ${type.name} branch`,
        );
      }
      return topic;
    }
    if (type !== undefined) return this.workflow.resolveTopic(type, name);
    const resolved = this.workflow.resolveBranch(name);
    if (resolved === undefined) {
      throw new ValidationError(`"${name}" does not match any configured topic prefix`);
    }
    return resolved;
  }

  async start(typeName: string, name: string, options: StartOptions = {}): Promise<StartResult> {
    const type = this.workflow.requireTopicType(typeName);
    const topic = this.workflow.resolveTopic(type, name);
    assertValidBranchName(topic.branch);

    if (!(await this.git.isClean())) {
      throw new ValidationError(
        "the working tree has uncommitted changes",
        "commit or stash them before starting a branch",
      );
    }
    if (await this.git.branchExists(topic.branch)) {
      throw new ValidationError(`branch "${topic.branch}" already exists`);
    }
    if (options.fetch === true && (await this.git.remoteExists(this.workflow.remote))) {
      await this.git.fetch(this.workflow.remote);
    }

    const startPoint = options.base ?? this.workflow.startPointOf(type);
    if (!(await this.git.refExists(startPoint))) {
      throw new ValidationError(
        `start point "${startPoint}" does not exist`,
        "create the base branch first, or pass an explicit start point",
      );
    }

    await this.ctx.hooks.run("pre-start", {
      branch: topic.branch,
      topicType: type.name,
      parent: type.parent,
    });
    await this.git.createBranch(topic.branch, startPoint);
    await this.git.checkout(topic.branch);
    await this.ctx.hooks.run("post-start", {
      branch: topic.branch,
      topicType: type.name,
      parent: type.parent,
    });

    return { branch: topic.branch, startPoint };
  }

  async finish(topic: ResolvedTopic, options: FinishOptions = {}): Promise<FinishResult> {
    if (this.ctx.state.exists()) {
      throw new OperationStateError(
        "another gitwe operation is in progress",
        "run the command with --continue or --abort first",
      );
    }
    return new FinishOperation(this.ctx, topic, options).execute();
  }

  /** Resume a finish that stopped on conflicts. */
  async continueOperation(): Promise<FinishResult> {
    const state = this.ctx.state.require();
    const conflicts = await this.git.conflictedFiles();
    if (conflicts.length > 0) {
      throw new ValidationError(
        `unresolved conflicts in: ${conflicts.join(", ")}`,
        "resolve them and `git add` the files, then run --continue again",
      );
    }
    if (await this.git.rebaseInProgress()) {
      await this.git.continueRebase();
    } else if (await this.git.mergeInProgress()) {
      await this.git.raw(["commit", "--no-edit"]);
    }
    const type = this.workflow.requireTopicType(state.topicType);
    const topic = this.workflow.resolveTopic(type, state.branch);
    return new FinishOperation(this.ctx, topic, state.options as FinishOptions, state).execute();
  }

  /** Roll a stopped finish back to the state the repository started in. */
  async abortOperation(): Promise<void> {
    const state = this.ctx.state.require();
    if (await this.git.rebaseInProgress()) await this.git.abortRebase();
    if (await this.git.mergeInProgress()) await this.git.abortMerge();

    for (const tag of state.createdTags) {
      if ((await this.git.tags()).includes(tag)) await this.git.deleteTag(tag);
    }
    const current = await this.git.currentBranch();
    for (const [branch, sha] of Object.entries(state.snapshots)) {
      if (!(await this.git.branchExists(branch))) continue;
      if (branch === current) await this.git.resetHard(sha);
      else await this.git.raw(["update-ref", `refs/heads/${branch}`, sha]);
    }
    if (state.originalBranch !== undefined && (await this.git.branchExists(state.originalBranch))) {
      await this.git.checkout(state.originalBranch);
    }
    this.ctx.state.clear();
  }

  async update(topic: ResolvedTopic, options: UpdateOptions = {}): Promise<UpdateResult> {
    const parent = topic.type.parent;
    if (!(await this.git.branchExists(topic.branch))) {
      throw new ValidationError(`branch "${topic.branch}" does not exist`);
    }
    if (!(await this.git.isClean())) {
      throw new ValidationError("the working tree has uncommitted changes");
    }
    if (options.fetch === true && (await this.git.remoteExists(this.workflow.remote))) {
      await this.git.fetch(this.workflow.remote);
    }
    const strategy: "merge" | "rebase" =
      options.rebase === true ? "rebase" : topic.type.downstreamStrategy;

    if (await this.git.isAncestor(parent, topic.branch)) {
      return { branch: topic.branch, parent, strategy, alreadyUpToDate: true };
    }
    await this.ctx.hooks.run("pre-update", {
      branch: topic.branch,
      topicType: topic.type.name,
      parent,
    });
    await this.git.checkout(topic.branch);
    if (strategy === "rebase") {
      await this.git.rebase(parent);
    } else {
      await this.git.merge(parent, {
        noFf: true,
        message: `Merge branch '${parent}' into ${topic.branch}`,
        noVerify: options.noVerify,
      });
    }
    await this.ctx.hooks.run("post-update", {
      branch: topic.branch,
      topicType: topic.type.name,
      parent,
    });
    return { branch: topic.branch, parent, strategy, alreadyUpToDate: false };
  }

  async publish(topic: ResolvedTopic, options: PublishOptions = {}): Promise<string> {
    const remote = this.workflow.remote;
    if (!(await this.git.branchExists(topic.branch))) {
      throw new ValidationError(`branch "${topic.branch}" does not exist`);
    }
    if (!(await this.git.remoteExists(remote))) {
      throw new ValidationError(`remote "${remote}" is not configured`);
    }
    await this.ctx.hooks.run("pre-publish", { branch: topic.branch, topicType: topic.type.name });
    await this.git.push(remote, topic.branch, {
      setUpstream: true,
      pushOptions: options.pushOptions,
    });
    await this.ctx.hooks.run("post-publish", { branch: topic.branch, topicType: topic.type.name });
    return `${remote}/${topic.branch}`;
  }

  async track(typeName: string, name: string): Promise<string> {
    const type = this.workflow.requireTopicType(typeName);
    const topic = this.workflow.resolveTopic(type, name);
    const remote = this.workflow.remote;
    if (!(await this.git.remoteExists(remote))) {
      throw new ValidationError(`remote "${remote}" is not configured`);
    }
    await this.git.fetch(remote);
    if (!(await this.git.remoteBranchExists(remote, topic.branch))) {
      throw new ValidationError(`${remote}/${topic.branch} does not exist`);
    }
    if (await this.git.branchExists(topic.branch)) {
      await this.git.setUpstream(topic.branch, remote);
    } else {
      await this.git.createTrackingBranch(topic.branch, remote);
    }
    await this.git.checkout(topic.branch);
    return topic.branch;
  }

  async deleteTopic(topic: ResolvedTopic, options: DeleteOptions = {}): Promise<DeleteResult> {
    if (!(await this.git.branchExists(topic.branch))) {
      throw new ValidationError(`branch "${topic.branch}" does not exist`);
    }
    await this.ctx.hooks.run("pre-delete", { branch: topic.branch, topicType: topic.type.name });
    if ((await this.git.currentBranch()) === topic.branch) {
      await this.git.checkout(topic.type.parent);
    }
    await this.git.deleteBranch(topic.branch, options.force === true);
    let deletedRemote = false;
    if (options.remote === true) {
      const remote = this.workflow.remote;
      if (await this.git.remoteBranchExists(remote, topic.branch)) {
        await this.git.push(remote, topic.branch, { delete: true });
        deletedRemote = true;
      }
    }
    await this.ctx.hooks.run("post-delete", { branch: topic.branch, topicType: topic.type.name });
    return { branch: topic.branch, deletedRemote };
  }

  async rename(topic: ResolvedTopic, newName: string): Promise<string> {
    const target = this.workflow.resolveTopic(topic.type, newName);
    assertValidBranchName(target.branch);
    if (!(await this.git.branchExists(topic.branch))) {
      throw new ValidationError(`branch "${topic.branch}" does not exist`);
    }
    if (await this.git.branchExists(target.branch)) {
      throw new ValidationError(`branch "${target.branch}" already exists`);
    }
    await this.git.renameBranch(topic.branch, target.branch);
    return target.branch;
  }

  /** Check out a topic branch, accepting a unique prefix of its name. */
  async checkout(type: TopicType, name: string): Promise<string> {
    const exact = this.workflow.resolveTopic(type, name);
    if (await this.git.branchExists(exact.branch)) {
      await this.git.checkout(exact.branch);
      return exact.branch;
    }
    const candidates = (await this.git.listBranches()).filter((branch) =>
      branch.startsWith(exact.branch),
    );
    if (candidates.length === 0) {
      throw new ValidationError(`no ${type.name} branch matches "${name}"`);
    }
    if (candidates.length > 1) {
      throw new ValidationError(`"${name}" matches multiple branches`, candidates.join(", "));
    }
    await this.git.checkout(candidates[0]);
    return candidates[0];
  }

  async listTopics(type: TopicType, pattern?: string): Promise<BranchStatus[]> {
    const current = await this.git.currentBranch();
    const matcher = pattern === undefined ? undefined : globToRegExp(pattern);
    const branches = (await this.git.listBranches())
      .filter((branch) => branch.startsWith(type.prefix))
      .filter((branch) => matcher?.test(branch.slice(type.prefix.length)) ?? true)
      .sort();
    const statuses: BranchStatus[] = [];
    for (const branch of branches) {
      const counts = (await this.git.branchExists(type.parent))
        ? await this.git.aheadBehind(branch, type.parent)
        : { ahead: 0, behind: 0 };
      statuses.push({
        name: branch,
        current: branch === current,
        ahead: counts.ahead,
        behind: counts.behind,
        upstream: await this.git.upstreamOf(branch),
      });
    }
    return statuses;
  }

  async overview(): Promise<OverviewReport> {
    const current = await this.git.currentBranch();
    const health: OverviewReport["health"] = [];
    const baseBranches: OverviewReport["baseBranches"] = [];

    for (const base of this.workflow.baseBranches) {
      const exists = await this.git.branchExists(base.name);
      if (!exists) {
        health.push({ level: "error", message: `base branch "${base.name}" is missing` });
      }
      const upstream = exists ? await this.git.upstreamOf(base.name) : undefined;
      let ahead = 0;
      let behind = 0;
      if (exists && upstream !== undefined) {
        ({ ahead, behind } = await this.git.aheadBehind(base.name, upstream));
        if (behind > 0) {
          health.push({
            level: "warning",
            message: `"${base.name}" is ${behind} commit(s) behind ${upstream}`,
          });
        }
      }
      baseBranches.push({
        name: base.name,
        parent: base.parent,
        exists,
        current: base.name === current,
        ahead,
        behind,
        upstream,
      });
    }

    const branches = await this.git.listBranches();
    const topicTypes = this.workflow.topicTypes.map((type) => ({
      name: type.name,
      prefix: type.prefix,
      parent: type.parent,
      branches: branches.filter((branch) => branch.startsWith(type.prefix)).sort(),
    }));

    if (!(await this.git.isClean())) {
      health.push({ level: "warning", message: "the working tree has uncommitted changes" });
    }
    if (this.ctx.state.exists()) {
      health.push({
        level: "warning",
        message: "a gitwe operation is in progress (use --continue or --abort)",
      });
    }
    if (health.length === 0) {
      health.push({ level: "ok", message: "workflow is healthy" });
    }

    return {
      workflow: this.workflow.config.name,
      configPath: this.configPath,
      currentBranch: current,
      remote: this.workflow.remote,
      baseBranches,
      topicTypes,
      health,
    };
  }

  /** Create any base branch that the workflow declares but the repo lacks. */
  async createMissingBaseBranches(): Promise<string[]> {
    if (!(await this.git.hasCommits())) return [];
    const created: string[] = [];
    for (const base of this.workflow.baseBranches) {
      if (await this.git.branchExists(base.name)) continue;
      const startPoint =
        base.parent !== undefined && (await this.git.branchExists(base.parent))
          ? base.parent
          : "HEAD";
      await this.git.createBranch(base.name, startPoint);
      created.push(base.name);
    }
    return created;
  }
}

export type { FinishOptions, FinishResult };
