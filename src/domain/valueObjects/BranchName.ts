import { InvalidBranchNameError } from "../errors";

const VALID_CHARS = /^[a-zA-Z0-9_\-./]+$/;

/**
 * A validated git branch (short) name. Value objects are immutable and
 * compare by value, not identity — this keeps validation in exactly one
 * place instead of re-checking `.trim()`/whitespace at every call site.
 */
export class BranchName {
  private constructor(private readonly value: string) {}

  /** Validates and wraps a short name, e.g. "login" (not "feature/login"). */
  static fromShortName(raw: string): BranchName {
    if (!raw || !raw.trim()) {
      throw new InvalidBranchNameError(raw, "branch short name cannot be empty");
    }
    if (/\s/.test(raw)) {
      throw new InvalidBranchNameError(raw, "branch short name cannot contain whitespace");
    }
    if (!VALID_CHARS.test(raw)) {
      throw new InvalidBranchNameError(raw, "branch short name contains invalid characters");
    }
    return new BranchName(raw);
  }

  /** Wraps an already-qualified full branch name, e.g. "feature/login", with lighter validation. */
  static fromFullName(raw: string): BranchName {
    if (!raw || !raw.trim()) {
      throw new InvalidBranchNameError(raw, "branch name cannot be empty");
    }
    if (/\s/.test(raw)) {
      throw new InvalidBranchNameError(raw, "branch name cannot contain whitespace");
    }
    return new BranchName(raw);
  }

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

