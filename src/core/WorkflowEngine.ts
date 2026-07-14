import type { GitAdapter } from "../adapters/GitAdapter";
import type { WorkflowDefinition, BranchTypeRule } from "./WorkflowDefinition";
import { validateWorkflowDefinition } from "./WorkflowDefinition";
import type { Logger } from "../logging/Logger";
import { NoopLogger } from "../logging/Logger";
import type { MergeResult } from "./types";
import {
  UnknownBranchTypeError,
  InvalidBranchNameError,
  BranchNotFoundError,
  UnrecognizedBranchError,
} from "./errors";

export interface FinishOptions {
  /** Delete the branch after a successful merge into all its targets. Overrides the rule's `deleteOnFinish`. */
  deleteAfterMerge?: boolean;
}

export interface FinishResult {
  branch: string;
  merges: MergeResult[];
  deleted: boolean;
}

/**
 * WorkflowEngine is the top-level entry point for the library.
 *
 * It owns no git plumbing itself (that's GitAdapter) and no I/O
 * beyond what's injected (Logger). Everything it does is: validate
 * an operation against the WorkflowDefinition, then delegate to the
 * adapter.
 */
export class WorkflowEngine {
  constructor(
    private readonly git: GitAdapter,
    private readonly definition: WorkflowDefinition,
    private readonly logger: Logger = new NoopLogger(),
  ) {
    validateWorkflowDefinition(definition);
  }

  async currentBranch(): Promise<string> {
    return this.git.getCurrentBranch();
  }

  async listBranches() {
    return this.git.listBranches();
  }

  /** Branch types defined by the injected WorkflowDefinition, e.g. ["feature", "release", "hotfix"]. */
  listBranchTypes(): string[] {
    return this.definition.branchTypes.map((r) => r.name);
  }

  /**
   * Start a new branch of a given type (feature/release/hotfix/...),
   * validated against the WorkflowDefinition.
   *
   * Example: engine.start("feature", "login") creates "feature/login" from "develop".
   */
  async start(branchType: string, shortName: string): Promise<string> {
    const rule = this.findRuleByTypeName(branchType);
    this.validateShortName(shortName);

    const fullName = `${rule.prefix}${shortName}`;

    if (!(await this.git.branchExists(rule.baseBranch))) {
      throw new BranchNotFoundError(rule.baseBranch);
    }

    await this.git.createBranch(fullName, { from: rule.baseBranch, checkout: true });
    this.logger.info("started branch", { type: branchType, branch: fullName });
    return fullName;
  }

  /**
   * Finish a branch: merge it into every merge target configured for
   * its type, in order, then optionally delete it. The branch's type
   * is inferred from its prefix (e.g. "feature/login" -> "feature").
   */
  async finish(fullBranchName: string, options: FinishOptions = {}): Promise<FinishResult> {
    const rule = this.findRuleByBranchName(fullBranchName);

    if (!(await this.git.branchExists(fullBranchName))) {
      throw new BranchNotFoundError(fullBranchName);
    }

    const merges: MergeResult[] = [];
    for (const target of rule.mergeTargets) {
      if (!(await this.git.branchExists(target))) {
        throw new BranchNotFoundError(target);
      }
      const result = await this.git.merge(fullBranchName, target);
      merges.push(result);
      this.logger.info("merged branch", { source: fullBranchName, target });
    }

    const shouldDelete = options.deleteAfterMerge ?? rule.deleteOnFinish ?? true;
    if (shouldDelete) {
      await this.git.deleteBranch(fullBranchName);
      this.logger.info("deleted finished branch", { branch: fullBranchName });
    }

    return { branch: fullBranchName, merges, deleted: shouldDelete };
  }

  private findRuleByTypeName(branchType: string): BranchTypeRule {
    const rule = this.definition.branchTypes.find((r) => r.name === branchType);
    if (!rule) {
      throw new UnknownBranchTypeError(branchType, this.listBranchTypes());
    }
    return rule;
  }

  private findRuleByBranchName(fullBranchName: string): BranchTypeRule {
    const rule = this.definition.branchTypes.find((r) => fullBranchName.startsWith(r.prefix));
    if (!rule) {
      throw new UnrecognizedBranchError(fullBranchName);
    }
    return rule;
  }

  private validateShortName(shortName: string): void {
    if (shortName.trim() === "") {
      throw new InvalidBranchNameError(shortName, "cannot be empty");
    }
    if (/\s/.test(shortName)) {
      throw new InvalidBranchNameError(shortName, "cannot contain whitespace");
    }
    if (shortName.includes("..")) {
      throw new InvalidBranchNameError(shortName, 'cannot contain ".."');
    }
  }
}
