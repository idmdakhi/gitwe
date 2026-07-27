import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { Capability } from "#gitwe/kernel/capabilities/Capability";

import { RuleEvaluator } from "#gitwe/domain/services/RuleEvaluator";
import type { WorkflowAction } from "#gitwe/domain/rules/RuleContext";

export class RuleValidationCapability implements Capability<any, any> {
  readonly name = "validate.rules";
  readonly description = "Validate workflow rules using RuleEvaluator";

  constructor(private readonly ruleEvaluator: RuleEvaluator) {}

  async execute(input: any, context: PipelineContext<any, any>): Promise<any> {
    // تشخیص نوع action از input یا context
    let action: WorkflowAction;
    let branchName: string;
    let baseBranch: string | undefined;

    if (input.branchType !== undefined && input.shortName !== undefined) {
      // Start action
      action = "start";
      const rule = context.workflow.findBranchType(input.branchType);
      if (!rule) throw new Error(`Unknown branch type: ${input.branchType}`);
      branchName = `${rule.prefix}${input.shortName}`;
      baseBranch = rule.baseBranch;
    } else if (input.branchName !== undefined) {
      // Finish or Update action
      action = "finish"; // برای finish
      branchName = input.branchName;
      // برای update هم می‌توان از finish استفاده کرد یا action جداگانه تعریف کرد
      // فعلاً فرض می‌کنیم finish است
    } else {
      // در غیر این صورت، کاری نمی‌کنیم
      return context.output;
    }

    await this.ruleEvaluator.assertAllSatisfied({
      workflow: context.workflow,
      action,
      branchName,
      baseBranch,
      git: context.git,
    });

    return context.output;
  }
}
