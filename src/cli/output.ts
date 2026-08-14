/**
 * Output helpers for gitwe CLI.
 * Supports text, JSON, YAML and table formats with a stable machine-readable envelope (RFC-0004).
 */

import { dump as yamlDump } from "js-yaml";
import type { OutputFormat } from "./options.js";

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

export function isColorEnabled(): boolean {
  return colorEnabled;
}

/**
 * ANSI style helpers.
 * All styles become no-ops when colors are disabled.
 */
export const style = {
  red: (s: string): string => (colorEnabled ? `\x1B[31m${s}\x1B[0m` : s),

  green: (s: string): string => (colorEnabled ? `\x1B[32m${s}\x1B[0m` : s),

  yellow: (s: string): string => (colorEnabled ? `\x1B[33m${s}\x1B[0m` : s),

  blue: (s: string): string => (colorEnabled ? `\x1B[34m${s}\x1B[0m` : s),

  cyan: (s: string): string => (colorEnabled ? `\x1B[36m${s}\x1B[0m` : s),

  bold: (s: string): string => (colorEnabled ? `\x1B[1m${s}\x1B[0m` : s),

  dim: (s: string): string => (colorEnabled ? `\x1B[2m${s}\x1B[0m` : s),
};

/**
 * Print a human-readable message.
 *
 * An empty message prints a blank line.
 */
export function print(message = ""): void {
  process.stdout.write(`${message}\n`);
}

/**
 * Print a successful human-readable command result.
 *
 * This is intentionally a small compatibility helper because
 * command implementations currently use `success(...)`.
 */
export function success(message: string): void {
  print(style.green(message));
}

/**
 * Build the standard machine-readable envelope (RFC-0004).
 */
export function buildEnvelope<T>(
  command: string,
  data: T | null,
  options: {
    ok?: boolean;
    warnings?: string[];
    error?: {
      code: string;
      message: string;
      hint?: string;
      files?: string[];
    } | null;
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

/**
 * Print structured data according to the requested format.
 *
 * For JSON/YAML, the RFC-0004 envelope is used when `command`
 * is provided.
 */
export function printStructured<T>(
  data: T,
  format: OutputFormat,
  options: {
    command?: string;
    warnings?: string[];
  } = {},
): void {
  if (format === "json" || format === "yaml") {
    const payload =
      options.command != null
        ? buildEnvelope(options.command, data, {
            warnings: options.warnings,
          })
        : data;

    if (format === "json") {
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    } else {
      process.stdout.write(
        `${yamlDump(payload, {
          lineWidth: 120,
          noRefs: true,
        })}\n`,
      );
    }

    return;
  }

  // text / table – caller is responsible for human-readable rendering.
  if (typeof data === "string") {
    print(data);
  } else {
    print(JSON.stringify(data, null, 2));
  }
}

/**
 * Convenience for successful command results.
 */
export function printSuccess<T>(
  command: string,
  data: T,
  format: OutputFormat,
  warnings: string[] = [],
): void {
  if (format === "json" || format === "yaml") {
    printStructured(data, format, {
      command,
      warnings,
    });

    return;
  }

  if (typeof data === "string") {
    success(data);
  }
}

/**
 * Convenience for error results.
 */
export function printError(
  command: string,
  error: {
    code: string;
    message: string;
    hint?: string;
    files?: string[];
  },
  format: OutputFormat,
): void {
  if (format === "json" || format === "yaml") {
    const envelope = buildEnvelope(command, null, {
      ok: false,
      error,
    });

    if (format === "json") {
      process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
    } else {
      process.stdout.write(
        `${yamlDump(envelope, {
          lineWidth: 120,
          noRefs: true,
        })}\n`,
      );
    }

    return;
  }

  // Human-readable error printing stays in error-reporter.ts.
}

/**
 * Simple tree renderer.
 */

/** Render a parent/child branch tree. */
export function renderTree(
  roots: string[],
  childrenOf: (name: string) => string[],
  label: (name: string) => string,
): string[] {
  const lines: string[] = [];

  const walk = (name: string, prefix: string, last: boolean, depth: number): void => {
    const connector = depth === 0 ? "" : `${prefix}${last ? "└─ " : "├─ "}`;

    lines.push(`${connector}${label(name)}`);

    const children = childrenOf(name);

    const nextPrefix = depth === 0 ? "" : `${prefix}${last ? "   " : "│  "}`;

    children.forEach((child, index) => {
      walk(child, nextPrefix, index === children.length - 1, depth + 1);
    });
  };

  roots.forEach((root, index) => {
    walk(root, "", index === roots.length - 1, 0);
  });

  return lines;
}
