import { ValidationError } from "../errors/index.js";

const INVALID_CHARS = /[\s~^:?*[\\]|\.\.|@\{|\/{2,}|^\/|\/$|\.lock$|^\.|\.$/;

/**
 * A validated git branch short-name (the part after a type prefix,
 * e.g. `login` in `feature/login`). Centralises the naming rules so
 * every use case validates topic names the same way.
 */
export class BranchName {
  private constructor(readonly value: string) {}

  static create(raw: string): BranchName {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new ValidationError("a branch name is required");
    }
    if (INVALID_CHARS.test(trimmed)) {
      throw new ValidationError(
        `"${raw}" is not a valid git branch name`,
        "avoid spaces, `~^:?*[\\`, consecutive slashes, and leading/trailing dots or slashes",
      );
    }
    return new BranchName(trimmed);
  }

  toString(): string {
    return this.value;
  }
}
