import type { GitRepository } from "../../domain/ports/GitRepository";
import { Workflow } from "../../domain/aggregates/Workflow";
import { BranchTreeNode, StatusReport } from "../dto/StatusReport";

/** Builds a parent/child tree of branches and a small statistics summary. */
export class StatusService {
  constructor(private readonly git: GitRepository) {}

  async buildReport(workflow: Workflow, rootBranch: string): Promise<StatusReport> {
    const branches = await this.git.listBranches();
    const branchNames = branches.map((b) => b.name);
    const currentBranch = await this.git.getCurrentBranch();

    const parentOf = new Map<string, string>();
    for (const name of branchNames) {
      if (name === rootBranch) continue;
      const parent = await this.git.getBranchParent(name);
      parentOf.set(name, parent && branchNames.includes(parent) ? parent : rootBranch);
    }

    const buildNode = (name: string): BranchTreeNode => {
      const children = [...parentOf.entries()]
        .filter(([, parent]) => parent === name)
        .map(([child]) => child)
        .sort()
        .map(buildNode);
      return { name, isCurrent: name === currentBranch, children };
    };

    return {
      currentBranch,
      totalBranches: branches.length,
      branchTypes: workflow.listBranchTypeNames(),
      tree: buildNode(rootBranch),
    };
  }
}
