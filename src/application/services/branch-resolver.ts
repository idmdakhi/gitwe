import type { GitRepository } from "#gitwe/domain/ports/git-repository";
import type { Workflow } from "#gitwe/domain/aggregates/workflow";
import { BranchTypeRule } from "#gitwe/domain/valueObjects/branch-type-rule";
import {
  UnknownBranchTypeError,
  UnrecognizedBranchError,
  AmbiguousBranchMatchError,
  RemoteBranchNotFoundError,
} from "#gitwe/domain/errors/index";

/**
 * Resolves user-supplied branch identifiers (a type + short name, a full
 * name, or a partial query) into concrete branch names and their
 * governing {@link BranchTypeRule}. Centralizing this logic keeps every
 * CLI command and handler consistent about how "which branch do you
 * mean?" is answered.
 *
 * @public
 */
export class BranchResolver {
  constructor(private readonly git: GitRepository) {}

  /**
   * Combines a branch type name and short name into a full branch name.
   * @throws {UnknownBranchTypeError} If `branchType` isn't declared on `workflow`.
   */
  buildFullName(workflow: Workflow, branchType: string, shortName: string): string {
    const rule = workflow.findBranchType(branchType);
    if (!rule) {
      throw new UnknownBranchTypeError(branchType, workflow.listBranchTypeNames());
    }
    return `${rule.prefix}${shortName}`;
  }

  /**
   * Finds the {@link BranchTypeRule} governing a full branch name.
   * @throws {UnrecognizedBranchError} If no branch type's prefix matches.
   */
  ruleForBranch(workflow: Workflow, fullBranchName: string): BranchTypeRule {
    const rule = workflow.findRuleForBranch(fullBranchName);
    if (!rule) throw new UnrecognizedBranchError(fullBranchName);
    return rule;
  }

  /**
   * Resolves a partial or full branch name to exactly one existing local
   * branch, for use by `checkout`. Matching is: exact name, then
   * case-sensitive substring match across local branch names.
   *
   * @throws {AmbiguousBranchMatchError} If more than one local branch matches `query`.
   */
  async resolveLocalMatch(query: string): Promise<string | undefined> {
    const branches = await this.git.listBranches();
    const localNames = branches.filter((b) => !b.isRemote).map((b) => b.name);

    if (localNames.includes(query)) return query;

    const matches = localNames.filter((name) => name.includes(query));
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) throw new AmbiguousBranchMatchError(query, matches);
    return undefined;
  }

  /**
   * Resolves a branch name to a remote branch on `remote`, for use by
   * `track`. Tries the exact name first, then a unique substring match.
   *
   * @throws {RemoteBranchNotFoundError} If no remote branch matches.
   * @throws {AmbiguousBranchMatchError} If more than one remote branch matches.
   */
  async resolveRemoteMatch(query: string, remote: string): Promise<string> {
    const branches = await this.git.listBranches();
    const prefix = `${remote}/`;
    const remoteNames = branches
      .filter((b) => b.isRemote && b.name.startsWith(prefix))
      .map((b) => b.name.slice(prefix.length));

    if (remoteNames.includes(query)) return query;

    const matches = remoteNames.filter((name) => name.includes(query));
    if (matches.length === 1) {
      const match = matches[0];
      if (match !== undefined) return match;
    }
    if (matches.length > 1) throw new AmbiguousBranchMatchError(query, matches);
    throw new RemoteBranchNotFoundError(query, remote);
  }
}
