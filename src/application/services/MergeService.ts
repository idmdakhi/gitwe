import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import { MergeOutcome } from "#gitwe/domain/valueObjects/MergeOutcome";
import { BranchTypeRule } from "#gitwe/domain/valueObjects/BranchTypeRule";
import { BranchNotFoundError } from "#gitwe/domain/errors/index";

/** Orchestrates merging a branch into every merge target its branch type declares. */
export class MergeService {
  constructor(private readonly git: GitRepository) {}

  async mergeIntoAllTargets(branchName: string, rule: BranchTypeRule): Promise<MergeOutcome[]> {
    const outcomes: MergeOutcome[] = [];
    for (const target of rule.mergeTargets) {
      if (!(await this.git.branchExists(target))) {
        throw new BranchNotFoundError(target);
      }
      outcomes.push(await this.git.merge(branchName, target, { noFastForward: true }));
    }
    return outcomes;
  }
}
