import type { RuleContext } from "#gitwe/domain/rules/rule-context";
import { RuleResult } from "#gitwe/domain/rules/result";

/**
 * A single, independently testable precondition for a workflow action
 * (the Specification pattern). {@link RuleEvaluator} runs an ordered list
 * of these and turns the first failure into a `WorkflowRuleViolationError`.
 *
 * @public
 */
export interface Rule {
  /** Stable, human-readable name used in error messages. */
  readonly name: string;
  /** Evaluates this rule. Must not throw for expected failures — return a failed {@link RuleResult} instead. */
  evaluate(context: RuleContext): Promise<RuleResult>;
}
