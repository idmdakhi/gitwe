/**
 * Shared CLI output helpers (text + machine-readable).
 * Envelope shape follows RFC-0004 when `command` is provided.
 *
 * Prefer {@link CommandOutput} from command handlers so format branching
 * stays in one place.
 */

import { dump as yamlDump } from "js-yaml";

export type OutputFormat = "text" | "json" | "yaml";

export interface OutputEnvelope<T = unknown> {
  schemaVersion: 1;
  command: string;
  ok: boolean;
  data: T | null;
  warnings: string[];
  error: {
    code: string;
    message: string;
    hint?: string;
    files?: string[];
  } | null;
}

/** What a successful command returns to the output layer. */
export interface CommandResult<T = unknown> {
  /** Machine-readable payload (json / yaml `data`). */
  data?: T | undefined;
  /** One-line success message (text mode). */
  message?: string | undefined;
  /** Extra human lines under the success message (text mode). */
  details?: string[] | undefined;
  /** Surfaced in envelope.warnings and as yellow lines in text. */
  warnings?: string[] | undefined;
}

let colorEnabled = true;

export function setColorEnabled(enabled: boolean): void {
  colorEnabled = enabled;
}

export const style = {
  red: (s: string): string => (colorEnabled ? `\x1B[31m${s}\x1B[0m` : s),
  green: (s: string): string => (colorEnabled ? `\x1B[32m${s}\x1B[0m` : s),
  yellow: (s: string): string => (colorEnabled ? `\x1B[33m${s}\x1B[0m` : s),
  cyan: (s: string): string => (colorEnabled ? `\x1B[36m${s}\x1B[0m` : s),
  bold: (s: string): string => (colorEnabled ? `\x1B[1m${s}\x1B[0m` : s),
  dim: (s: string): string => (colorEnabled ? `\x1B[2m${s}\x1B[0m` : s),
};

export function print(message = ""): void {
  process.stdout.write(`${message}\n`);
}

export function success(message: string): void {
  print(style.green(message));
}

export function warn(message: string): void {
  print(style.yellow(`warning: ${message}`));
}

export function buildEnvelope<T>(
  command: string,
  data: T | null,
  options: {
    ok?: boolean | undefined;
    warnings?: string[] | undefined;
    error?: OutputEnvelope["error"] | undefined;
  } = {},
): OutputEnvelope<T> {
  const ok = options.ok ?? options.error == null;
  return {
    schemaVersion: 1,
    command,
    ok,
    data: ok ? data : null,
    warnings: options.warnings ?? [],
    error: options.error ?? null,
  };
}

export function printStructured<T>(
  data: T,
  format: OutputFormat,
  options: { command?: string | undefined; warnings?: string[] | undefined } = {},
): void {
  if (format !== "json" && format !== "yaml") {
    if (typeof data === "string") print(data);
    else print(JSON.stringify(data, null, 2));
    return;
  }

  const payload =
    options.command != null
      ? buildEnvelope(options.command, data, { warnings: options.warnings })
      : data;

  if (format === "json") {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write(`${yamlDump(payload, { lineWidth: 120, noRefs: true })}\n`);
  }
}

/**
 * Per-command output facade. Handlers should prefer this over calling
 * print / success / printStructured directly.
 *
 * @example
 * out.ok({
 *   data: { path },
 *   message: `wrote ${path}`,
 *   details: [`Try: gitwe overview`],
 * });
 */
export class CommandOutput {
  constructor(
    readonly format: OutputFormat,
    readonly command: string,
  ) {}

  get isMachine(): boolean {
    return this.format === "json" || this.format === "yaml";
  }

  /** Final successful result — branches on format once. */
  ok<T>(result: CommandResult<T>): void {
    if (this.isMachine) {
      printStructured(result.data ?? null, this.format, {
        command: this.command,
        warnings: result.warnings,
      });
      return;
    }

    if (result.message) success(result.message);
    for (const line of result.details ?? []) print(line);
    for (const w of result.warnings ?? []) warn(w);
  }

  /**
   * Progress / wizard lines. Silent in json|yaml so CI output stays pure.
   */
  note(message = ""): void {
    if (!this.isMachine) print(message);
  }

  /** Text-mode warning that is also collectable into a later ok(). */
  warn(message: string): void {
    if (!this.isMachine) warn(message);
  }

  /**
   * Machine or text error. Prefer throwing GitweError from action() instead;
   * this is for rare cases where the handler catches and reports itself.
   */
  fail(error: { code: string; message: string; hint?: string; files?: string[] }): void {
    if (this.isMachine) {
      const envelope = buildEnvelope(this.command, null, {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.hint ? { hint: error.hint } : {}),
          ...(error.files ? { files: error.files } : {}),
        },
      });
      if (this.format === "json") {
        process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
      } else {
        process.stdout.write(`${yamlDump(envelope, { lineWidth: 120, noRefs: true })}\n`);
      }
      return;
    }

    print(style.red(`error: ${error.message}`));
    if (error.hint) print(style.dim(`hint: ${error.hint}`));
    if (error.files?.length) {
      for (const f of error.files) print(style.dim(`  - ${f}`));
    }
  }
}
