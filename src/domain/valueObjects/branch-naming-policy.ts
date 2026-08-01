/** The style of casing a branch's short name may be required to follow. @public */
export type BranchNameCase = "kebab-case" | "snake_case" | "camelCase" | "any";

const CASE_PATTERNS: Record<Exclude<BranchNameCase, "any">, RegExp> = {
  "kebab-case": /^[a-z0-9]+(-[a-z0-9]+)*$/,
  snake_case: /^[a-z0-9]+(_[a-z0-9]+)*$/,
  camelCase: /^[a-z][a-zA-Z0-9]*$/,
};

/**
 * Configurable style rules for a branch's short name (the part after its
 * type prefix) — e.g. requiring kebab-case and a maximum length.
 *
 * An immutable value object: construct via {@link BranchNamingPolicy.create}.
 *
 * @public
 */
export class BranchNamingPolicy {
  private constructor(
    public readonly caseStyle: BranchNameCase,
    public readonly maxLength: number,
    public readonly pattern?: string,
  ) {}

  /**
   * @param props.case - Required casing style. Defaults to `"any"`.
   * @param props.maxLength - Maximum allowed length. Defaults to `100`.
   * @param props.pattern - Additional custom regex the name must match.
   */
  static create(
    props: { case?: BranchNameCase; maxLength?: number; pattern?: string } = {},
  ): BranchNamingPolicy {
    return new BranchNamingPolicy(props.case ?? "any", props.maxLength ?? 100, props.pattern);
  }

  /** Validates a short name against this policy, returning a violation reason or `undefined`. */
  validate(shortName: string): string | undefined {
    if (shortName.length > this.maxLength) {
      return `must be ${this.maxLength} characters or fewer (got ${shortName.length})`;
    }
    if (this.pattern && !new RegExp(this.pattern).test(shortName)) {
      return `must match pattern /${this.pattern}/`;
    }
    if (this.caseStyle !== "any" && !CASE_PATTERNS[this.caseStyle].test(shortName)) {
      return `must be ${this.caseStyle}`;
    }
    return undefined;
  }
}
