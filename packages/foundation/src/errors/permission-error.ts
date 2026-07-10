import { DomainError } from "./domain-error.js";

export class PermissionError extends DomainError {
  public constructor(
    message: string,

    metadata = {},
  ) {
    super(
      "AUTH.PERMISSION_DENIED",

      message,

      metadata,
    );
  }
}
