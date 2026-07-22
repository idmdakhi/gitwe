import { Rule } from "./Rule";
import { RuleContext } from "./RuleContext";
import { RuleResult } from "./RuleResult";

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
