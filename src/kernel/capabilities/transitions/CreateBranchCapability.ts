import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { Capability } from "#gitwe/kernel/capabilities/Capability";
import type { StartBranchCommand } from "#gitwe/application/commands/StartBranchCommand";
import type { StartBranchResult } from "#gitwe/application/dto/StartBranchResult";
import type { BranchService } from "#gitwe/application/services/BranchService";

export class CreateBranchCapability implements Capability<StartBranchCommand, StartBranchResult> {
  readonly name = "transition.create-branch";
  readonly description = "Create a new branch from base branch";

  constructor(private readonly branchService: BranchService) {}

  async execute(
    input: StartBranchCommand,
    context: PipelineContext<StartBranchCommand, StartBranchResult>,
  ): Promise<StartBranchResult> {
    const rule = context.workflow.findBranchType(input.branchType);
    if (!rule) {
      throw new Error(`Unknown branch type: ${input.branchType}`);
    }

    const branchName = await this.branchService.create(context.workflow, rule, input.shortName);

    context.metadata.set("createdBranch", branchName);
    context.metadata.set("branchRule", rule);

    return {
      branchName,
      baseBranch: rule.baseBranch,
    };
  }
}
