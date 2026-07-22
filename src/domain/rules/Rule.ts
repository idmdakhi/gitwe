import { RuleContext } from "#gitwe/domain/rules/RuleContext";
import { RuleResult } from "#gitwe/domain/rules/RuleResult";

/**
 * A single, independently testable precondition for a workflow action
 * (Specification pattern). `RuleEvaluator` runs a list of these and turns
 * the first failure into a `WorkflowRuleViolationError`.
 */
export interface Rule {
  readonly name: string;
  evaluate(context: RuleContext): Promise<RuleResult>;
}
