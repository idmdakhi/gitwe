/** The outcome of evaluating a single {@link Rule}. @public */
export interface RuleResult {
  readonly satisfied: boolean;
  readonly reason?: string;
}

/** Factory helpers for constructing {@link RuleResult} values. @public */
export const RuleResult = {
  pass(): RuleResult {
    return { satisfied: true };
  },
  fail(reason: string): RuleResult {
    return { satisfied: false, reason };
  },
};
