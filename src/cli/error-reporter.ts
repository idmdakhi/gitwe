import { ConflictError, GitweError } from "../domain/errors.js";
import { style } from "./output.js";

/**
 * Write a user-facing error to stderr.
 * Exit codes are decided by the caller (`run`): conflict → 2, everything else → 1.
 */
export function reportError(error: unknown): void {
  if (error instanceof ConflictError) {
    process.stderr.write(`${style.red("conflict:")} ${error.message}\n`);
    for (const file of error.files) process.stderr.write(`  ${file}\n`);
    if (error.hint !== undefined) process.stderr.write(`${style.dim(error.hint)}\n`);
    return;
  }
  if (error instanceof GitweError) {
    process.stderr.write(`${style.red("error:")} ${error.message}\n`);
    if (error.hint !== undefined) process.stderr.write(`${style.dim(error.hint)}\n`);
    return;
  }
  process.stderr.write(`${style.red("error:")} ${(error as Error).message}\n`);
}

/** Map a thrown value to a process exit code. */
export function exitCodeFor(error: unknown): number {
  return error instanceof ConflictError ? 2 : 1;
}
