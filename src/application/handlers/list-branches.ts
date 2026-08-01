import type { GitRepository } from "#gitwe/domain/ports/git-repository";
import type { Workflow } from "#gitwe/domain/aggregates/workflow";
import type { BranchSummaryDto } from "#gitwe/application/dto/results";

/**
 * Input for {@link ListBranchesHandler}.
 * @public
 */
export interface ListBranchesQuery {
  /** Restrict results to this branch type, e.g. `"feature"`. Lists every topic branch when omitted. */
  readonly branchType?: string;
}

/**
 * Use case: list topic branches, optionally filtered to one branch type.
 * Backs `gitwe list` / `gitwe <type> list`.
 *
 * @public
 */
export class ListBranchesHandler {
  constructor(
    private readonly workflow: Workflow,
    private readonly git: GitRepository,
  ) {}

  async handle(query: ListBranchesQuery = {}): Promise<BranchSummaryDto[]> {
    const branches = await this.git.listBranches();
    const results: BranchSummaryDto[] = [];

    for (const branch of branches) {
      if (branch.isRemote) continue;
      const rule = this.workflow.findRuleForBranch(branch.name);
      if (!rule) continue;
      if (query.branchType && rule.name !== query.branchType) continue;

      results.push({
        name: branch.name,
        type: rule.name,
        isCurrent: branch.isCurrent,
        hasUpstream: branch.upstream !== undefined,
      });
    }

    return results;
  }
}
