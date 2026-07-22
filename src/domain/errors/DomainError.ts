/**
 * Base class for every error this library throws, in any layer.
 * Carries a stable `code` so callers (CLI, other tools) can branch on
 * error type without fragile `instanceof` chains across module/package
 * boundaries (e.g. if this package ends up bundled twice).
 *
 * This is the ONLY error base class in the codebase — infrastructure
 * errors (e.g. `GitCommandError`) extend this too, so a CLI catch block
 * only ever needs to know about one hierarchy.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

