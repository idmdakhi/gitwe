import { Rule } from "./Rule";
import { RuleContext } from "./RuleContext";
import { RuleResult } from "./RuleResult";

/** Only applies to `finish`: refuses to merge with uncommitted local changes. */
export class WorkingTreeCleanRule implements Rule {
  readonly name = "WorkingTreeClean";

  async evaluate(context: RuleContext): Promise<RuleResult> {
    if (context.action !== "finish") return RuleResult.pass();
    const clean = await context.git.isWorkingTreeClean();
    return clean
      ? RuleResult.pass()
      : RuleResult.fail("working tree has uncommitted changes; commit or stash them first");
  }
}
