import type { ConditionalCapability } from "#gitwe/kernel/capabilities/Capability";
import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { StartBranchCommand } from "#gitwe/application/commands/StartBranchCommand";
import type { StartBranchResult } from "#gitwe/application/dto/StartBranchResult";
import { RuleEvaluator } from "#gitwe/domain/services/RuleEvaluator"; // ← به value تبدیل شد

export class ValidateStartPreconditionsCapability implements ConditionalCapability<
  StartBranchCommand,
  StartBranchResult
> {
  readonly name = "validate.start";
  readonly description = "Validate preconditions for starting a branch";

  constructor(private readonly ruleEvaluator: RuleEvaluator) {}

  isEnabled(): boolean {
    return true;
  }

  async execute(
    input: StartBranchCommand,
    context: PipelineContext<StartBranchCommand, StartBranchResult>,
  ): Promise<StartBranchResult> {
    const rule = context.workflow.findBranchType(input.branchType);
    if (!rule) {
      throw new Error(`Unknown branch type: ${input.branchType}`);
    }

    const fullName = `${rule.prefix}${input.shortName}`;

    await this.ruleEvaluator.assertAllSatisfied({
      workflow: context.workflow,
      action: "start",
      branchName: fullName,
      baseBranch: rule.baseBranch,
      git: context.git,
    });

    return {} as StartBranchResult;
  }
}
