import type { ErrorCode } from "./error-code.js";
import type { ErrorMetadata } from "./error-metadata.js";

export class DomainError extends Error {
  public readonly name = "DomainError";

  public constructor(
    public readonly code: ErrorCode,

    message: string,

    public readonly metadata: ErrorMetadata = {},

    public readonly cause?: unknown,
  ) {
    super(message);
  }
}
