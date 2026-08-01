import type { Rule } from "#gitwe/domain/rules/rule";
import type { RuleContext } from "#gitwe/domain/rules/rule-context";
import { RuleResult } from "#gitwe/domain/rules/result";

/** Applies to `finish`, `delete`, `publish`, `rename`, `checkout`: the target branch must exist. @public */
export class BranchExistsRule implements Rule {
  readonly name = "BranchExists";
  async evaluate(context: RuleContext): Promise<RuleResult> {
    if (context.action === "start") return RuleResult.pass();
    const exists = await context.git.branchExists(context.branchName);
    return exists
      ? RuleResult.pass()
      : RuleResult.fail(`Branch "${context.branchName}" does not exist.`);
  }
}
