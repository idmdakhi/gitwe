import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { Capability } from "#gitwe/kernel/capabilities/Capability";
import type { StartBranchCommand } from "#gitwe/application/commands/StartBranchCommand";
import type { StartBranchResult } from "#gitwe/application/dto/StartBranchResult";
import type { GitRepository } from "#gitwe/domain/ports/GitRepository";

export class CheckoutBranchCapability implements Capability<StartBranchCommand, StartBranchResult> {
  readonly name = "branch.checkout";
  readonly description = "Check out the newly created branch";

  constructor(private readonly git: GitRepository) {}

  async execute(
    _input: StartBranchCommand,
    context: PipelineContext<StartBranchCommand, StartBranchResult>,
  ): Promise<StartBranchResult> {
    const branchName = context.metadata.get("createdBranch") as string;
    if (!branchName) {
      throw new Error("No branch created yet. Cannot checkout.");
    }

    if (!context.dryRun) {
      await this.git.checkout(branchName);
    }

    return context.output as StartBranchResult;
  }
}
