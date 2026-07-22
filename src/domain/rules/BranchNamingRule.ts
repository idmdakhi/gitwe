import { Rule } from "#gitwe/domain/rules/Rule";
import { RuleContext } from "#gitwe/domain/rules/RuleContext";
import { RuleResult } from "#gitwe/domain/rules/RuleResult";

/** Only applies to `start`: the short name must satisfy the workflow's configured naming policy. */
export class BranchNamingRule implements Rule {
  readonly name = "BranchNaming";

  async evaluate(context: RuleContext): Promise<RuleResult> {
    if (context.action !== "start") return RuleResult.pass();

    // context.branchName is the full name (prefix + short name); recover the short part.
    const rule = context.workflow.findRuleForBranch(context.branchName);
    const shortName = rule ? context.branchName.slice(rule.prefix.length) : context.branchName;

    const violation = context.workflow.branchNaming.validate(shortName);
    return violation ? RuleResult.fail(violation) : RuleResult.pass();
  }
}
