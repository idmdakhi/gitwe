import { Rule } from "../rules/Rule";
import { RuleContext } from "../rules/RuleContext";
import { WorkflowRuleViolationError } from "../errors";

/**
 * Runs every registered rule against a context and stops at the first
 * rejection. This is the one place the codebase's rules are actually
 * invoked — earlier iterations of this project built rule classes and a
 * `RuleEngine` that were constructed but never wired into anything.
 */
export class RuleEvaluator {
  constructor(private readonly rules: readonly Rule[]) {}

  async assertAllSatisfied(context: RuleContext): Promise<void> {
    for (const rule of this.rules) {
      const result = await rule.evaluate(context);
      if (!result.satisfied) {
        throw new WorkflowRuleViolationError(rule.name, result.reason ?? "rule failed");
      }
    }
  }
}

