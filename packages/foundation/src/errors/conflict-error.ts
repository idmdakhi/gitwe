import { DomainError } from "./domain-error.js";

export class ConflictError extends DomainError {
  public constructor(
    message: string,

    metadata = {},
  ) {
    super(
      "CONFLICT.STATE",

      message,

      metadata,
    );
  }
}
