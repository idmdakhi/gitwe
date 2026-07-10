import { DomainError } from "./domain-error.js";

export class TimeoutError extends DomainError {
  public constructor(
    message = "Operation timed out.",

    metadata = {},
  ) {
    super(
      "SYSTEM.TIMEOUT",

      message,

      metadata,
    );
  }
}
