/**
 * Shared CLI output helpers (text + machine-readable).
 * Envelope shape follows RFC-0004 when `command` is provided.
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
  options: { command?: string; warnings?: string[] } = {},
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
