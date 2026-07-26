import { DomainError } from "#gitwe/domain/errors";

/** Formats any thrown error for CLI output and returns the process exit code to use. */
export function reportError(error: unknown, json = false): number {
  if (json) {
    const payload =
      error instanceof DomainError
        ? { error: true, code: error.code, message: error.message }
        : {
            error: true,
            code: "UNEXPECTED_ERROR",
            message: error instanceof Error ? error.message : String(error),
          };
    console.log(JSON.stringify(payload));
    return error instanceof DomainError ? 1 : 2;
  }

  if (error instanceof DomainError) {
    console.error(`❌ [${error.code}] ${error.message}`);
    return 1;
  }
  console.error(`❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  return 2;
}
