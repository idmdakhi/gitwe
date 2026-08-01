import type { Rule } from "#gitwe/domain/rules/rule";
import type { RuleContext } from "#gitwe/domain/rules/rule-context";
import { WorkflowRuleViolationError } from "#gitwe/domain/errors/index";

/**
 * Runs a fixed, ordered list of {@link Rule}s against a
 * {@link RuleContext} and stops at the first rejection. The list of rules
 * is supplied by the caller via the constructor, keeping `RuleEvaluator`
 * decoupled from which specific rules exist.
 *
 * @public
 */
export class RuleEvaluator {
  /** @param rules - The rules to evaluate, in order. */
  constructor(private readonly rules: readonly Rule[]) {}

  /**
   * @throws {WorkflowRuleViolationError} If any rule rejects the action.
   */
  async assertAllSatisfied(context: RuleContext): Promise<void> {
    for (const rule of this.rules) {
      const result = await rule.evaluate(context);
      if (!result.satisfied) {
        throw new WorkflowRuleViolationError(rule.name, result.reason ?? "rule failed");
      }
    }
  }
}
