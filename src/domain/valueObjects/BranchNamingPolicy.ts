export type BranchNameCase = "kebab-case" | "snake_case" | "camelCase" | "any";

const CASE_PATTERNS: Record<Exclude<BranchNameCase, "any">, RegExp> = {
  "kebab-case": /^[a-z0-9]+(-[a-z0-9]+)*$/,
  snake_case: /^[a-z0-9]+(_[a-z0-9]+)*$/,
  camelCase: /^[a-z][a-zA-Z0-9]*$/,
};

/**
 * Configurable style rules for a branch's short name (the part after the
 * type prefix), e.g. requiring kebab-case and a max length. Separate from
 * `BranchName`'s own invariants (non-empty, no whitespace, safe characters)
 * — those are structural and never configurable; this is a style policy a
 * team can tune per workflow.
 */
export class BranchNamingPolicy {
  private constructor(
    public readonly case_: BranchNameCase,
    public readonly maxLength: number,
    public readonly pattern?: string,
  ) {}

  static create(props: { case?: BranchNameCase; maxLength?: number; pattern?: string } = {}): BranchNamingPolicy {
    return new BranchNamingPolicy(props.case ?? "any", props.maxLength ?? 100, props.pattern);
  }

  /** Returns a violation reason, or `undefined` if `shortName` satisfies this policy. */
  validate(shortName: string): string | undefined {
    if (shortName.length > this.maxLength) {
      return `must be ${this.maxLength} characters or fewer (got ${shortName.length})`;
    }
    if (this.pattern && !new RegExp(this.pattern).test(shortName)) {
      return `must match pattern /${this.pattern}/`;
    }
    if (this.case_ !== "any" && !CASE_PATTERNS[this.case_].test(shortName)) {
      return `must be ${this.case_}`;
    }
    return undefined;
  }
}
