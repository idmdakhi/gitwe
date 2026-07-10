import { DomainError } from "./domain-error.js";

export class FatalError extends DomainError {
  public constructor(
    message: string,

    metadata = {},
  ) {
    super(
      "SYSTEM.FATAL",

      message,

      metadata,
    );
  }
}
