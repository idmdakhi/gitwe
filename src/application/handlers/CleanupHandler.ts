import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import { Workflow } from "#gitwe/domain/aggregates/Workflow";

export interface CleanupCandidate {
  readonly branchName: string;
  readonly mergedInto: string[];
}

export interface CleanupResult {
  readonly candidates: CleanupCandidate[];
  readonly deleted: string[];
  readonly dryRun: boolean;
}

/**
 * Use case: find local branches that (a) match one of the workflow's
 * branch-type prefixes, (b) are fully merged into every one of that
 * type's merge targets, and (c) aren't protected or the current branch —
 * then optionally delete them. This is what `gitwe clean` runs.
 */
export class CleanupHandler {
  constructor(
    private readonly git: GitRepository,
    private readonly workflow: Workflow,
  ) {}

  async handle(options: { dryRun?: boolean } = {}): Promise<CleanupResult> {
    const dryRun = options.dryRun ?? false;
    const [branches, currentBranch] = await Promise.all([
      this.git.listBranches(),
      this.git.getCurrentBranch(),
    ]);

    const candidates: CleanupCandidate[] = [];
    for (const branch of branches) {
      if (branch.name === currentBranch) continue;
      if (this.workflow.isProtected(branch.name)) continue;

      const rule = this.workflow.findRuleForBranch(branch.name);
      if (!rule) continue;

      const mergedInto: string[] = [];
      for (const target of rule.mergeTargets) {
        if (!(await this.git.branchExists(target))) continue;
        if (await this.git.isMerged(branch.name, target)) mergedInto.push(target);
      }

      // Only a cleanup candidate if it's merged into *every* configured target.
      if (mergedInto.length === rule.mergeTargets.length) {
        candidates.push({ branchName: branch.name, mergedInto });
      }
    }

    const deleted: string[] = [];
    if (!dryRun) {
      for (const candidate of candidates) {
        await this.git.deleteBranch(candidate.branchName);
        deleted.push(candidate.branchName);
      }
    }

    return { candidates, deleted, dryRun };
  }
}

