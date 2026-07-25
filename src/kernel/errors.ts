import { DomainError } from "#gitwe/domain/errors";

/** Thrown when `kernel.run(name, ...)` is called with a name no module registered under. */
export class ModuleNotFoundError extends DomainError {
  readonly code = "MODULE_NOT_FOUND";
  constructor(
    public readonly name: string,
    public readonly registered: string[],
  ) {
    super(
      registered.length > 0
        ? `No module named "${name}" is registered. Available: ${registered.join(", ")}`
        : `No module named "${name}" is registered, and no modules are registered at all.`,
    );
  }
}

/** Thrown when two modules try to register under the same name. */
export class DuplicateModuleError extends DomainError {
  readonly code = "DUPLICATE_MODULE";
  constructor(public readonly name: string) {
    super(`A module named "${name}" is already registered.`);
  }
}
