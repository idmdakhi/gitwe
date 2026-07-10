import { DomainError } from "./domain-error.js";

export class NotFoundError extends DomainError {
  public constructor(
    message: string,

    metadata = {},
  ) {
    super(
      "RESOURCE.NOT_FOUND",

      message,

      metadata,
    );
  }
}
