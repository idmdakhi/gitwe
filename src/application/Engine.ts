import { assertValidBranchName, globToRegExp } from "../domain/branch-name.js";
import { OperationStateError, ValidationError } from "../domain/errors.js";
import { silentLogger, type Logger } from "./interfaces/logger.js";
import type {
  BranchStatus,
  BranchType,
  ResolvedBranch,
  WorkflowConfig,
} from "../domain/entities.js";
import { Workflow } from "../domain/workflow.js";
import type { GitRepository } from "./interfaces/git-repository.js";
import type { EngineContext } from "./context.js";
import type { HookRunner } from "./interfaces/hook-runner.js";
import { FinishOperation, type FinishOptions, type FinishResult } from "./use-case/finish.js";
import type { OperationStateStore } from "./interfaces/operation-state.js";

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
  base: string;
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
  baseBranches: Array<BranchStatus & { base?: string; exists: boolean }>;
  branchTypes: Array<{
    name: string;
    prefix: string;
    base: string;
    target: string[] | string;
    branches: string[];
  }>;
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
  /** Resolve a branch type + name to a ResolvedBranch */
  resolve(typeName: string, name: string): ResolvedBranch {
    const branchType = this.workflow.requireBranchType(typeName);
    return this.workflow.resolveBranchType(branchType, name);
  }

  /** Resolve the checked-out branch as a branch type */
  async currentBranchType(): Promise<ResolvedBranch> {
    const branch = await this.git.currentBranch();
    if (branch === undefined) {
      throw new ValidationError("HEAD is detached; check out a branch first");
    }
    const resolved = this.workflow.resolveBranch(branch);
    if (resolved === undefined) {
      throw new ValidationError(
        `"${branch}" is not a branch type of the "${this.workflow.config.name}" workflow`,
        `prefixes: ${this.workflow.branchTypes.map((t) => t.prefix).join(", ")}`,
      );
    }
    return resolved;
  }

  async resolveTarget(type: BranchType | undefined, name?: string): Promise<ResolvedBranch> {
    if (name === undefined) {
      const resolved = await this.currentBranchType();
      if (type !== undefined && resolved.type.name !== type.name) {
        throw new ValidationError(
          `the current branch is a ${resolved.type.name} branch, not a ${type.name} branch`,
        );
      }
      return resolved;
    }
    if (type !== undefined) return this.workflow.resolveBranchType(type, name);
    const resolved = this.workflow.resolveBranch(name);
    if (resolved === undefined) {
      throw new ValidationError(`"${name}" does not match any configured branch type prefix`);
    }
    return resolved;
  }

  async start(typeName: string, name: string, options: StartOptions = {}): Promise<StartResult> {
    const branchType = this.workflow.requireBranchType(typeName);
    const resolved = this.workflow.resolveBranchType(branchType, name);
    assertValidBranchName(resolved.branch);

    if (!(await this.git.isClean())) {
      throw new ValidationError(
        "the working tree has uncommitted changes",
        "commit or stash them before starting a branch",
      );
    }
    if (await this.git.branchExists(resolved.branch)) {
      throw new ValidationError(`branch "${resolved.branch}" already exists`);
    }
    if (options.fetch === true && (await this.git.remoteExists(this.workflow.remoteName))) {
      await this.git.fetch(this.workflow.remoteName);
    }

    const startPoint = options.base ?? this.workflow.baseOf(branchType);
    if (!(await this.git.refExists(startPoint))) {
      throw new ValidationError(
        `start point "${startPoint}" does not exist`,
        "create the base branch first, or pass an explicit start point",
      );
    }

    await this.ctx.hooks.run("pre-start", {
      branch: resolved.branch,
      branchType: branchType.name,
      parent: branchType.target.join(","),
    });
    await this.git.createBranch(resolved.branch, startPoint);
    await this.git.checkout(resolved.branch);
    await this.ctx.hooks.run("post-start", {
      branch: resolved.branch,
      branchType: branchType.name,
      parent: branchType.target.join(","),
    });

    return { branch: resolved.branch, startPoint };
  }

  async finish(resolved: ResolvedBranch, options: FinishOptions = {}): Promise<FinishResult> {
    if (this.ctx.state.exists()) {
      throw new OperationStateError(
        "another gitwe operation is in progress",
        "run the command with --continue or --abort first",
      );
    }
    return new FinishOperation(this.ctx, resolved, options).execute();
  }

  async update(resolved: ResolvedBranch, options: UpdateOptions = {}): Promise<UpdateResult> {
    const base = resolved.type.target[0];
    if (base === undefined) {
      throw new ValidationError(
        `branch type "${resolved.type.name}" has no target configured`,
        "update is only available for branch types with at least one target",
      );
    }
    if (!(await this.git.branchExists(resolved.branch))) {
      throw new ValidationError(`branch "${resolved.branch}" does not exist`);
    }
    if (!(await this.git.isClean())) {
      throw new ValidationError("the working tree has uncommitted changes");
    }
    if (options.fetch === true && (await this.git.remoteExists(this.workflow.remoteName))) {
      await this.git.fetch(this.workflow.remoteName);
    }

    // محاسبه استراتژی: فقط "merge" یا "rebase" برای update معتبر است
    const strategy =
      options.rebase === true
        ? "rebase"
        : this.workflow.mergeStrategyFor(resolved.type) === "rebase"
          ? "rebase"
          : "merge";

    if (await this.git.isAncestor(base, resolved.branch)) {
      return { branch: resolved.branch, base, strategy, alreadyUpToDate: true };
    }

    await this.ctx.hooks.run("pre-update", {
      branch: resolved.branch,
      branchType: resolved.type.name,
      base,
    });
    await this.git.checkout(resolved.branch);
    if (strategy === "rebase") {
      await this.git.rebase(base);
    } else {
      await this.git.merge(base, {
        noFf: true,
        message: `Merge branch '${base}' into ${resolved.branch}`,
        noVerify: options.noVerify,
      });
    }
    await this.ctx.hooks.run("post-update", {
      branch: resolved.branch,
      branchType: resolved.type.name,
      base,
    });
    return { branch: resolved.branch, base, strategy, alreadyUpToDate: false };
  }

  async publish(resolved: ResolvedBranch, options: PublishOptions = {}): Promise<string> {
    const remote = this.workflow.remoteName;
    if (!(await this.git.branchExists(resolved.branch))) {
      throw new ValidationError(`branch "${resolved.branch}" does not exist`);
    }
    if (!(await this.git.remoteExists(remote))) {
      throw new ValidationError(`remote "${remote}" is not configured`);
    }
    await this.ctx.hooks.run("pre-publish", {
      branch: resolved.branch,
      branchType: resolved.type.name,
    });
    await this.git.push(remote, resolved.branch, {
      setUpstream: true,
      pushOptions: options.pushOptions,
    });
    await this.ctx.hooks.run("post-publish", {
      branch: resolved.branch,
      branchType: resolved.type.name,
    });
    return `${remote}/${resolved.branch}`;
  }

  async track(typeName: string, name: string): Promise<string> {
    const branchType = this.workflow.requireBranchType(typeName);
    const resolved = this.workflow.resolveBranchType(branchType, name);
    const remote = this.workflow.remoteName;
    if (!(await this.git.remoteExists(remote))) {
      throw new ValidationError(`remote "${remote}" is not configured`);
    }
    await this.git.fetch(remote);
    if (!(await this.git.remoteBranchExists(remote, resolved.branch))) {
      throw new ValidationError(`${remote}/${resolved.branch} does not exist`);
    }
    if (await this.git.branchExists(resolved.branch)) {
      await this.git.setUpstream(resolved.branch, remote);
    } else {
      await this.git.createTrackingBranch(resolved.branch, remote);
    }
    await this.git.checkout(resolved.branch);
    return resolved.branch;
  }

  async deleteBranchType(
    resolved: ResolvedBranch,
    options: DeleteOptions = {},
  ): Promise<DeleteResult> {
    if (!(await this.git.branchExists(resolved.branch))) {
      throw new ValidationError(`branch "${resolved.branch}" does not exist`);
    }
    await this.ctx.hooks.run("pre-delete", {
      branch: resolved.branch,
      branchType: resolved.type.name,
    });
    if ((await this.git.currentBranch()) === resolved.branch) {
      const targets = this.workflow.targetsOf(resolved.type);
      await this.git.checkout(targets[0] ?? this.workflow.rootBranch.name);
    }
    await this.git.deleteBranch(resolved.branch, options.force === true);
    let deletedRemote = false;
    if (options.remote === true) {
      const remote = this.workflow.remoteName;
      if (await this.git.remoteBranchExists(remote, resolved.branch)) {
        await this.git.push(remote, resolved.branch, { delete: true });
        deletedRemote = true;
      }
    }
    await this.ctx.hooks.run("post-delete", {
      branch: resolved.branch,
      branchType: resolved.type.name,
    });
    return { branch: resolved.branch, deletedRemote };
  }

  async rename(resolved: ResolvedBranch, newName: string): Promise<string> {
    const target = this.workflow.resolveBranchType(resolved.type, newName);
    assertValidBranchName(target.branch);
    if (!(await this.git.branchExists(resolved.branch))) {
      throw new ValidationError(`branch "${resolved.branch}" does not exist`);
    }
    if (await this.git.branchExists(target.branch)) {
      throw new ValidationError(`branch "${target.branch}" already exists`);
    }
    await this.git.renameBranch(resolved.branch, target.branch);
    return target.branch;
  }

  async checkout(type: BranchType, name: string): Promise<string> {
    const exact = this.workflow.resolveBranchType(type, name);
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

  async listBranchTypes(type: BranchType, pattern?: string): Promise<BranchStatus[]> {
    const current = await this.git.currentBranch();
    const matcher = pattern === undefined ? undefined : globToRegExp(pattern);
    const branches = (await this.git.listBranches())
      .filter((branch) => branch.startsWith(type.prefix))
      .filter((branch) => matcher?.test(branch.slice(type.prefix.length)) ?? true)
      .sort();
    const statuses: BranchStatus[] = [];
    for (const branch of branches) {
      const target = type.target[0] ?? this.workflow.rootBranch.name;
      const counts = (await this.git.branchExists(target))
        ? await this.git.aheadBehind(branch, target)
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
        base: base.base,
        exists,
        current: base.name === current,
        ahead,
        behind,
        upstream,
      });
    }

    const branches = await this.git.listBranches();
    const branchTypes = this.workflow.branchTypes.map((type) => ({
      name: type.name,
      prefix: type.prefix,
      base: type.base,
      target: type.target,
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
      remote: this.workflow.remoteName,
      baseBranches,
      branchTypes,
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
        base.base !== undefined && (await this.git.branchExists(base.base)) ? base.base : "HEAD";
      await this.git.createBranch(base.name, startPoint);
      created.push(base.name);
    }
    return created;
  }

  /**
   * Roll a stopped finish back to the state the repository started in.
   */
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

  /**
   * Continue a previously interrupted finish operation.
   * Requires an existing operation state (created by a previous finish that stopped on conflict).
   */
  async continueOperation(): Promise<FinishResult> {
    const state = this.ctx.state.require();
    if (state.operation !== "finish") {
      throw new OperationStateError(
        `unsupported operation: ${state.operation}`,
        "only finish operations can be continued",
      );
    }
    const branchType = this.workflow.requireBranchType(state.branchType);
    const resolved: ResolvedBranch = {
      branch: state.branch,
      shortName: state.branch.slice(branchType.prefix.length),
      type: branchType,
    };
    const options = state.options as FinishOptions;
    const finishOp = new FinishOperation(this.ctx, resolved, options, state);
    return finishOp.execute();
  }
}

export type { FinishOptions, FinishResult };
