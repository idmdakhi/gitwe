/**
 * Maps domain errors to user-facing stderr messages and exit codes.
 */

import { style, printError } from "./output.js";
import type { OutputFormat } from "./options.js";

// Minimal local error shapes so this file stays independent of the full domain tree
export interface GitweErrorLike {
  code?: string;
  message: string;
  hint?: string;
  files?: string[];
  name?: string;
}

export function isConflictError(err: unknown): err is GitweErrorLike {
  return (
    typeof err === "object" &&
    err !== null &&
    ((err as any).name === "ConflictError" || (err as any).code === "CONFLICT")
  );
}

/**
 * Human-readable error reporting (always goes to stderr).
 */
export function reportError(err: unknown): void {
  if (isConflictError(err)) {
    const e = err as GitweErrorLike;
    process.stderr.write(style.red(`conflict: ${e.message}`) + "\n");
    if (e.files && e.files.length > 0) {
      process.stderr.write(style.yellow("Conflicted files:") + "\n");
      for (const f of e.files) {
        process.stderr.write(`  - ${f}\n`);
      }
    }
    const hint =
      e.hint ??
      "Resolve the conflicts, then run `gitwe finish --continue` (or `gitwe finish --abort` to cancel).";
    process.stderr.write(style.dim(hint) + "\n");
    return;
  }

  if (typeof err === "object" && err !== null && "message" in err) {
    const e = err as GitweErrorLike;
    const code = e.code ? `[${e.code}] ` : "";
    process.stderr.write(style.red(`error: ${code}${e.message}`) + "\n");
    if (e.hint) {
      process.stderr.write(style.dim(`hint: ${e.hint}`) + "\n");
    }
    return;
  }

  // Unknown error
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(style.red(`error: ${message}`) + "\n");
}

/**
 * Exit code mapping.
 * 0 = success
 * 1 = ordinary error
 * 2 = merge/rebase conflict (resume with --continue or --abort)
 */
export function exitCodeFor(err: unknown): number {
  if (isConflictError(err)) return 2;
  return 1;
}

/**
 * Report an error and also emit a machine-readable envelope when format is json/yaml.
 */
export function reportAndPrintError(
  command: string,
  err: unknown,
  format: OutputFormat = "text",
): number {
  reportError(err);

  if (format === "json" || format === "yaml") {
    const e = err as GitweErrorLike;
    printError(
      command,
      {
        code: e.code ?? (isConflictError(err) ? "CONFLICT" : "ERROR"),
        message: e.message ?? String(err),
        hint: e.hint,
        files: e.files,
      },
      format,
    );
  }

  return exitCodeFor(err);
}
