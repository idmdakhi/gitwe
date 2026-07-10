import { DomainError } from "./domain-error.js";

export class CancelledError extends DomainError {
  public constructor(
    message = "Operation cancelled.",

    metadata = {},
  ) {
    super(
      "SYSTEM.CANCELLED",

      message,

      metadata,
    );
  }
}
