import { DomainError } from "#gitwe/domain/errors/index";

/** Formats any thrown error for CLI output and returns the process exit code to use. */
export function reportError(error: unknown): number {
  if (error instanceof DomainError) {
    console.error(`❌ [${error.code}] ${error.message}`);
    return 1;
  }
  console.error(`❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  return 2;
}
