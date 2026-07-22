export interface RuleResult {
  readonly satisfied: boolean;
  readonly reason?: string;
}

export const RuleResult = {
  pass(): RuleResult {
    return { satisfied: true };
  },
  fail(reason: string): RuleResult {
    return { satisfied: false, reason };
  },
};

