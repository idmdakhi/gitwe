import type { Rule } from "#gitwe/domain/rules/rule";
import type { RuleContext } from "#gitwe/domain/rules/rule-context";
import { RuleResult } from "#gitwe/domain/rules/result";
import { ProtectedBranchError } from "#gitwe/domain/errors/index";

/** Applies to `delete`, `rename`: refuses to act on a branch listed as protected. @public */
export class NotProtectedRule implements Rule {
  readonly name = "NotProtected";
  async evaluate(context: RuleContext): Promise<RuleResult> {
    if (context.action !== "delete" && context.action !== "rename") return RuleResult.pass();
    if (!context.workflow.isProtected(context.branchName)) return RuleResult.pass();
    const error = new ProtectedBranchError(context.branchName, context.action);
    return RuleResult.fail(error.message);
  }
}
