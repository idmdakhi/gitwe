import type { Rule } from "#gitwe/domain/rules/rule";
import type { RuleContext } from "#gitwe/domain/rules/rule-context";
import { RuleResult } from "#gitwe/domain/rules/result";

/** Applies to `finish` and `update`: refuses to merge/rebase while the working tree has uncommitted changes. @public */
export class WorkingTreeCleanRule implements Rule {
  readonly name = "WorkingTreeClean";
  async evaluate(context: RuleContext): Promise<RuleResult> {
    if (context.action !== "finish" && context.action !== "update") return RuleResult.pass();
    const clean = await context.git.isWorkingTreeClean();
    return clean
      ? RuleResult.pass()
      : RuleResult.fail("Working tree has uncommitted changes; commit or stash them first.");
  }
}
