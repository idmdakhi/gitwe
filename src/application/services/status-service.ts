import type { GitRepository } from "#gitwe/domain/ports/git-repository";
import type { Workflow } from "#gitwe/domain/aggregates/workflow";
import type { StatusReport, BranchSummaryDto } from "#gitwe/application/dto/results";

/**
 * Assembles a repository-wide {@link StatusReport} from live git state and
 * the active workflow definition. Pure read/aggregation — performs no
 * mutations.
 *
 * @public
 */
export class StatusService {
  constructor(private readonly git: GitRepository) {}

  async buildReport(workflow: Workflow): Promise<StatusReport> {
    const [currentBranch, branches] = await Promise.all([
      this.git.getCurrentBranch(),
      this.git.listBranches(),
    ]);

    const topicBranches: BranchSummaryDto[] = [];
    for (const branch of branches) {
      if (branch.isRemote) continue;
      if (workflow.isProtected(branch.name)) continue;
      const rule = workflow.findRuleForBranch(branch.name);
      topicBranches.push({
        name: branch.name,
        ...(rule?.name !== undefined ? { type: rule.name } : {}),
        isCurrent: branch.isCurrent,
        hasUpstream: branch.upstream !== undefined,
      });
    }

    return {
      currentBranch,
      workflowName: workflow.name,
      baseBranches: workflow.baseBranches.map((b) => b.name),
      branchTypes: workflow.listBranchTypeNames(),
      topicBranches,
    };
  }
}
