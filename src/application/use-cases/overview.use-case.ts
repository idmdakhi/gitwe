import type { WorkflowService } from "../../domain/services/workflow.service.js";
import type { GitRepository } from "../../domain/ports/git-repository.port.js";

export interface BranchTypeSummary {
  readonly type: string;
  readonly base: string;
  readonly target: readonly string[];
  readonly count: number;
}

export interface WorkflowOverview {
  readonly workflowName: string;
  readonly currentBranch?: string;
  readonly baseBranches: readonly string[];
  readonly branchTypes: readonly BranchTypeSummary[];
}

export class OverviewUseCase {
  constructor(private readonly workflow: WorkflowService, private readonly git: GitRepository) {}

  async execute(): Promise<WorkflowOverview> {
    const branchTypes: BranchTypeSummary[] = [];
    for (const type of this.workflow.branchTypes) {
      const branches = await this.git.listBranches(`${type.prefix}*`);
      branchTypes.push({ type: type.name, base: type.base, target: type.target, count: branches.length });
    }

    const currentBranch = await this.git.currentBranch();

    return {
      workflowName: this.workflow.config.name,
      ...(currentBranch ? { currentBranch } : {}),
      baseBranches: this.workflow.baseBranches.map((b) => b.name),
      branchTypes,
    };
  }
}
