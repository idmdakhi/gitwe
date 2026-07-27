// src/kernel/capabilities/transitions/UpdateBranchCapability.ts
import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { Capability } from "#gitwe/kernel/capabilities/Capability";
import type { UpdateBranchCommand } from "#gitwe/application/commands/UpdateBranchCommand";
import type { UpdateBranchResult } from "#gitwe/application/dto/UpdateBranchResult";
import type { GitRepository } from "#gitwe/domain/ports/GitRepository";

export class UpdateBranchCapability implements Capability<UpdateBranchCommand, UpdateBranchResult> {
  readonly name = "branch.update";
  readonly description = "Update a branch with changes from its base";

  constructor(private readonly git: GitRepository) {}

  async execute(
    input: UpdateBranchCommand,
    context: PipelineContext<UpdateBranchCommand, UpdateBranchResult>,
  ): Promise<UpdateBranchResult> {
    const rule = context.workflow.findRuleForBranch(input.branchName);
    if (!rule) {
      throw new Error(`No rule found for branch: ${input.branchName}`);
    }

    const parent = rule.baseBranch;
    const strategy = input.strategy ?? rule.downstreamStrategy ?? "merge";

    if (strategy === "rebase") {
      await this.git.rebase(input.branchName, parent);
      return { branchName: input.branchName, parent, strategy: "rebase" };
    }

    const outcome = await this.git.merge(parent, input.branchName, { noFastForward: false });
    return {
      branchName: input.branchName,
      parent,
      strategy: "merge",
      fastForward: outcome.fastForward,
    };
  }
}
