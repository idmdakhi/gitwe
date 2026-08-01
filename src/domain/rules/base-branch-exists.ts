import type { Rule } from "#gitwe/domain/rules/rule";
import type { RuleContext } from "#gitwe/domain/rules/rule-context";
import { RuleResult } from "#gitwe/domain/rules/result";

/** Applies to `start`: the branch's starting-point base branch must already exist. @public */
export class BaseBranchExistsRule implements Rule {
  readonly name = "BaseBranchExists";
  async evaluate(context: RuleContext): Promise<RuleResult> {
    if (context.action !== "start" || !context.baseBranch) return RuleResult.pass();
    const exists = await context.git.branchExists(context.baseBranch);
    return exists
      ? RuleResult.pass()
      : RuleResult.fail(`Base branch "${context.baseBranch}" does not exist.`);
  }
}
