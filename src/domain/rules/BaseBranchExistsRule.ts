import { Rule } from "#gitwe/domain/rules/Rule";
import { RuleContext } from "#gitwe/domain/rules/RuleContext";
import { RuleResult } from "#gitwe/domain/rules/RuleResult";

/** Only applies to `start`: the configured base branch must exist before we can branch from it. */
export class BaseBranchExistsRule implements Rule {
  readonly name = "BaseBranchExists";

  async evaluate(context: RuleContext): Promise<RuleResult> {
    if (context.action !== "start" || !context.baseBranch) return RuleResult.pass();
    const exists = await context.git.branchExists(context.baseBranch);
    return exists
      ? RuleResult.pass()
      : RuleResult.fail(`base branch "${context.baseBranch}" does not exist`);
  }
}
