import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { Capability } from "#gitwe/kernel/capabilities/Capability";

import type { FinishBranchCommand } from "#gitwe/application/commands/FinishBranchCommand";
import type { FinishBranchResult } from "#gitwe/application/dto/FinishBranchResult";
import type { MergeService } from "#gitwe/application/services/MergeService";
import { BranchNotFoundError } from "#gitwe/domain/errors";

export class MergeCapability implements Capability<FinishBranchCommand, FinishBranchResult> {
  readonly name = "transition.merge";
  readonly description = "Merge branch into its configured targets";

  constructor(private readonly mergeService: MergeService) {}

  async execute(
    input: FinishBranchCommand,
    context: PipelineContext<FinishBranchCommand, FinishBranchResult>,
  ): Promise<FinishBranchResult> {
    const rule = context.workflow.findRuleForBranch(input.branchName);
    if (!rule) {
      throw new Error(`No rule found for branch: ${input.branchName}`);
    }

    const strategy = input.strategy ?? rule.mergeStrategy ?? context.workflow.mergeStrategy;

    // Check all targets exist
    for (const target of rule.mergeTargets) {
      if (!(await context.git.branchExists(target))) {
        throw new BranchNotFoundError(target);
      }
    }

    const outcomes = await this.mergeService.mergeIntoAllTargets(input.branchName, rule, strategy);

    context.metadata.set("mergeOutcomes", outcomes);
    context.metadata.set("resolvedStrategy", strategy);

    return {
      dryRun: input.dryRun ?? false,
      merges: outcomes.map((o) => ({
        source: o.source,
        target: o.target,
        fastForward: o.fastForward,
      })),
      tags: [],
      deleted: false,
    } as FinishBranchResult;
  }
}
