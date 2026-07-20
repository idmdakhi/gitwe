import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import { Workflow } from "#gitwe/domain/aggregates/Workflow";

export interface DoctorCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly detail?: string;
}

export interface DoctorReport {
  readonly checks: DoctorCheck[];
  readonly healthy: boolean;
}

/** Use case: run a small set of sanity checks against the repo and the active workflow. */
export class DoctorHandler {
  constructor(
    private readonly git: GitRepository,
    private readonly workflow: Workflow,
  ) {}

  async handle(): Promise<DoctorReport> {
    const checks: DoctorCheck[] = [];

    checks.push(await this.checkInsideRepo());
    checks.push(await this.checkWorkingTreeClean());
    checks.push(this.checkWorkflowHasBaseBranches());
    for (const rule of this.workflow.branchTypes) {
      checks.push(await this.checkBaseBranchExists(rule.name, rule.baseBranch));
    }

    return { checks, healthy: checks.every((c) => c.passed) };
  }

  private async checkInsideRepo(): Promise<DoctorCheck> {
    try {
      await this.git.getCurrentBranch();
      return { name: "Inside a git repository", passed: true };
    } catch {
      return {
        name: "Inside a git repository",
        passed: false,
        detail: "not on a branch, or not a git repository",
      };
    }
  }

  private async checkWorkingTreeClean(): Promise<DoctorCheck> {
    const clean = await this.git.isWorkingTreeClean();
    return {
      name: "Working tree is clean",
      passed: clean,
      detail: clean ? undefined : "there are uncommitted changes",
    };
  }

  private checkWorkflowHasBaseBranches(): DoctorCheck {
    // Workflow.create already enforces this invariant; this check just surfaces it explicitly.
    const hasAll = this.workflow.branchTypes.every((r) => Boolean(r.baseBranch));
    return { name: "Every branch type declares a base branch", passed: hasAll };
  }

  private async checkBaseBranchExists(typeName: string, baseBranch: string): Promise<DoctorCheck> {
    const exists = await this.git.branchExists(baseBranch);
    return {
      name: `Base branch "${baseBranch}" for type "${typeName}" exists`,
      passed: exists,
      detail: exists
        ? undefined
        : `create "${baseBranch}" before using the "${typeName}" branch type`,
    };
  }
}
