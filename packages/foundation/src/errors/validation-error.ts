import { DomainError } from "./domain-error.js";

export class ValidationError extends DomainError {
  public constructor(
    message: string,

    metadata = {},
  ) {
    super(
      "VALIDATION.INVALID",

      message,

      metadata,
    );
  }
}
