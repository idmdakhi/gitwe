/**
 * Base class for every error thrown by this library, in any layer.
 *
 * Every subclass exposes a stable `code` string so consumers can branch on
 * error type by comparing a string instead of relying on `instanceof`,
 * which can silently fail if a bundler/package manager ends up with two
 * copies of `gitwe` in the dependency tree.
 *
 * @public
 */
export abstract class DomainError extends Error {
  /** Stable, machine-readable identifier for this error type. */
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
