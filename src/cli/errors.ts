import { DomainError } from "#gitwe/domain/errors";

/** Thrown when a CLI flag is given a value outside its allowed set (e.g. `--strategy bogus`). */
export class InvalidCliOptionError extends DomainError {
  readonly code = "INVALID_CLI_OPTION";
  constructor(
    public readonly option: string,
    public readonly value: string,
    public readonly allowed: string[],
  ) {
    super(`Invalid value "${value}" for ${option}. Expected one of: ${allowed.join(", ")}`);
  }
}
