import type { GitAdapter } from "../git/GitAdapter";
import type { WorkflowDefinition, BranchTypeRule } from "./WorkflowDefinition";
import { gitFlowDefinition } from "./WorkflowDefinition";
import type { Logger } from "../logging/Logger";
import { NoopLogger } from "../logging/Logger";
import type { Branch, MergeResult } from "./types";
import {
  BranchAlreadyExistsError,
  BranchNotFoundError,
  InvalidBranchNameError,
  UnknownBranchTypeError,
  UnrecognizedBranchError,
} from "./errors";
import { HookManager } from "./HookManager";

export interface FinishOptions {
  /** Delete the branch after a successful merge. Defaults to true, but is still
   *  overridden by `deleteOnFinish: false` on the matching branch-type rule. */
  deleteAfterMerge?: boolean;
  /** Push to the configured remote once the branch has finished. */
  pushAfterFinish?: boolean;
}

export interface FinishResult {
  merges: MergeResult[];
  deleted: boolean;
  tags?: string[];
}

/**
 * Orchestrates the two core workflow operations — `start` and `finish` —
 * against an injected `GitAdapter`, driven entirely by a `WorkflowDefinition`.
 * Nothing here is hardcoded to git-flow; swap the definition to get a
 * different branching strategy for free.
 */
export class WorkflowEngine {
  private readonly hookManager: HookManager;

  constructor(
    public readonly git: GitAdapter,
    private readonly definition: WorkflowDefinition = gitFlowDefinition,
    private readonly logger: Logger = new NoopLogger(),
  ) {
    this.hookManager = new HookManager(process.cwd(), definition.hooks, logger);
  }

  private getRuleForBranch(branchName: string): BranchTypeRule | undefined {
    return this.definition.branchTypes.find((rule) => branchName.startsWith(rule.prefix));
  }

  private validateShortName(name: string): void {
    if (!name || !name.trim()) {
      throw new InvalidBranchNameError(name, "branch short name cannot be empty");
    }
    if (/\s/.test(name)) {
      throw new InvalidBranchNameError(name, "branch short name cannot contain whitespace");
    }
  }

  async currentBranch(): Promise<string> {
    return this.git.getCurrentBranch();
  }

  async listBranches(): Promise<Branch[]> {
    return this.git.listBranches();
  }

  listBranchTypes(): string[] {
    return this.definition.branchTypes.map((t) => t.name);
  }

  /**
   * Creates and checks out a new branch of the given type, e.g.
   * `start("feature", "login")` -> creates & checks out `feature/login`
   * from the type's configured base branch.
   */
  async start(type: string, shortName: string): Promise<string> {
    const rule = this.definition.branchTypes.find((r) => r.name === type);
    if (!rule) {
      throw new UnknownBranchTypeError(type, this.listBranchTypes());
    }
    this.validateShortName(shortName);

    const fullName = `${rule.prefix}${shortName}`;
    if (await this.git.branchExists(fullName)) {
      throw new BranchAlreadyExistsError(fullName);
    }
    if (!(await this.git.branchExists(rule.baseBranch))) {
      throw new BranchNotFoundError(rule.baseBranch);
    }

    await this.hookManager.runHooks("preStart");
    await this.git.createBranch(fullName, { from: rule.baseBranch, checkout: true });
    await this.hookManager.runHooks("postStart");

    this.logger.info(`Started branch ${fullName} from ${rule.baseBranch}`);
    return fullName;
  }

  /**
   * Merges a branch into all of its type's configured merge targets, tags
   * it if `autoTag` is configured, and (by default) deletes it afterwards.
   */
  async finish(branchName: string, options: FinishOptions = {}): Promise<FinishResult> {
    const { deleteAfterMerge = true } = options;

    if (!(await this.git.branchExists(branchName))) {
      throw new BranchNotFoundError(branchName);
    }

    const rule = this.getRuleForBranch(branchName);
    if (!rule) {
      throw new UnrecognizedBranchError(branchName);
    }

    await this.hookManager.runHooks("preFinish");

    const merges: MergeResult[] = [];
    for (const target of rule.mergeTargets) {
      if (!(await this.git.branchExists(target))) {
        throw new BranchNotFoundError(target);
      }
      merges.push(await this.git.merge(branchName, target, { noFastForward: true }));
    }

    const tags: string[] = [];
    if (rule.autoTag) {
      const prefix = rule.autoTag.prefix ?? "v";
      let version = branchName.replace(rule.prefix, "");
      if (rule.autoTag.pattern) {
        const match = version.match(new RegExp(rule.autoTag.pattern));
        if (match) version = match[1] ?? version;
      }
      const tagName = `${prefix}${version}`;
      await this.git.createTag(tagName, `Release ${version}`);
      tags.push(tagName);
      this.logger.info(`Created tag ${tagName}`);
    }

    let deleted = false;
    if (deleteAfterMerge && rule.deleteOnFinish !== false) {
      await this.git.deleteBranch(branchName);
      deleted = true;
    }

    await this.hookManager.runHooks("postFinish");

    if (options.pushAfterFinish || this.definition.remote?.autoPush) {
      const remote = this.definition.remote?.remote ?? "origin";
      await this.git.push(remote);
    }

    return { merges, deleted, tags };
  }

  async getBranchParent(branch: string): Promise<string | undefined> {
    return this.git.getBranchParent(branch);
  }
}
