import { DomainError } from "./domain-error.js";

export class RetryableError extends DomainError {
  public constructor(
    message: string,

    metadata = {},
  ) {
    super(
      "SYSTEM.RETRYABLE",

      message,

      metadata,
    );
  }
}
