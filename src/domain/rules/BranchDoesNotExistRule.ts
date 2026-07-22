import { Rule } from "#gitwe/domain/rules/Rule";
import { RuleContext } from "#gitwe/domain/rules/RuleContext";
import { RuleResult } from "#gitwe/domain/rules/RuleResult";

/** Only applies to `start`: the new branch must not already exist. */
export class BranchDoesNotExistRule implements Rule {
  readonly name = "BranchDoesNotExist";

  async evaluate(context: RuleContext): Promise<RuleResult> {
    if (context.action !== "start") return RuleResult.pass();
    const exists = await context.git.branchExists(context.branchName);
    return exists
      ? RuleResult.fail(`branch "${context.branchName}" already exists`)
      : RuleResult.pass();
  }
}
