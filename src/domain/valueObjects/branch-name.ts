import { InvalidBranchNameError } from "#gitwe/domain/errors/index";

/** Characters allowed in a branch short name by this library's policy (stricter than raw git). */
const VALID_CHARS = /^[a-zA-Z0-9_\-./]+$/;

/**
 * A validated git branch name. Validation lives in exactly one place — the
 * two static factories — instead of every call site re-checking
 * whitespace/character rules by hand.
 *
 * @public
 */
export class BranchName {
  private constructor(private readonly value: string) {}

  /**
   * Validates and wraps a *short* name — the part after a type prefix,
   * e.g. `"login"` for the full branch `"feature/login"`.
   *
   * @throws {InvalidBranchNameError} If empty, whitespace-only, contains whitespace, or has disallowed characters.
   */
  static fromShortName(raw: string): BranchName {
    if (!raw || !raw.trim()) {
      throw new InvalidBranchNameError(raw, "branch name cannot be empty");
    }
    if (/\s/.test(raw)) {
      throw new InvalidBranchNameError(raw, "branch name cannot contain whitespace");
    }
    if (!VALID_CHARS.test(raw)) {
      throw new InvalidBranchNameError(raw, "branch name contains invalid characters");
    }
    return new BranchName(raw);
  }

  /**
   * Wraps an already-qualified full branch name (e.g. `"feature/login"`)
   * with lighter validation, since prefixes may legitimately contain
   * characters the short-name policy would reject.
   *
   * @throws {InvalidBranchNameError} If empty or contains whitespace.
   */
  static fromFullName(raw: string): BranchName {
    if (!raw || !raw.trim()) {
      throw new InvalidBranchNameError(raw, "branch name cannot be empty");
    }
    if (/\s/.test(raw)) {
      throw new InvalidBranchNameError(raw, "branch name cannot contain whitespace");
    }
    return new BranchName(raw);
  }

  /** Returns a new `BranchName` with `prefix` prepended. */
  withPrefix(prefix: string): BranchName {
    return new BranchName(`${prefix}${this.value}`);
  }

  toString(): string {
    return this.value;
  }

  equals(other: BranchName): boolean {
    return this.value === other.value;
  }
}
