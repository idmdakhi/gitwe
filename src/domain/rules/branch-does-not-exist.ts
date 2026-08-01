import type { Rule } from "#gitwe/domain/rules/rule";
import type { RuleContext } from "#gitwe/domain/rules/rule-context";
import { RuleResult } from "#gitwe/domain/rules/result";

/** Applies to `start`: rejects creating a branch whose name is already taken. @public */
export class BranchDoesNotExistRule implements Rule {
  readonly name = "BranchDoesNotExist";
  async evaluate(context: RuleContext): Promise<RuleResult> {
    if (context.action !== "start") return RuleResult.pass();
    const exists = await context.git.branchExists(context.branchName);
    return exists
      ? RuleResult.fail(`Branch "${context.branchName}" already exists.`)
      : RuleResult.pass();
  }
}
