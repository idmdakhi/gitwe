import type { Rule } from "#gitwe/domain/rules/rule";
import type { RuleContext } from "#gitwe/domain/rules/rule-context";
import { RuleResult } from "#gitwe/domain/rules/result";

/** Applies to `start`: the branch's short name must satisfy the workflow's {@link BranchNamingPolicy}. @public */
export class BranchNamingRule implements Rule {
  readonly name = "BranchNaming";
  async evaluate(context: RuleContext): Promise<RuleResult> {
    if (context.action !== "start") return RuleResult.pass();

    const rule = context.workflow.findRuleForBranch(context.branchName);
    const shortName = rule ? rule.shortNameOf(context.branchName) : context.branchName;

    const violation = context.workflow.branchNaming.validate(shortName);
    return violation ? RuleResult.fail(`Branch name ${violation}.`) : RuleResult.pass();
  }
}
