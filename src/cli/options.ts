/** Global CLI flags accepted anywhere on the command line. */
/**
 * Shared --format / --json option helpers for every major command.
 * Ensures RFC-0004 consistency across start, finish, list, version,
 * config list, doctor, overview, status, …
 */

import type { Command } from "commander";
import { isValidFormat } from "./args.js";

export type OutputFormat = "text" | "json" | "yaml" | "table";

export interface GlobalOptions {
  /** Path to the workflow definition (`-C` / `--config`). */
  config?: string;
  /** Run as if gitwe was started in this directory (`--cwd`). */
  cwd?: string;
  /** Print every git command gitwe runs (`-v` / `--verbose`). */
  verbose?: boolean;
  /** Simulate the operation without making changes (`--dry-run`). */
  dryRun?: boolean;
  /** Output format (`--format`). */
  format?: "text" | "json" | "yaml" | "table";
}

/** Commander option descriptors shared by the root program and every leaf command. */
export const GLOBAL_OPTION_FLAGS = [
  { flags: "-C, --config <path>", description: "path to the workflow definition" },
  { flags: "--cwd <path>", description: "run as if gitwe was started in <path>" },
  { flags: "-v, --verbose", description: "show every git command gitwe runs" },
  { flags: "--no-color", description: "disable coloured output" },
  { flags: "--dry-run", description: "simulate the operation without making changes" },
  { flags: "--format <format>", description: "output format: text, json, yaml, table" },
] as const;

/**
 * Attach --format and legacy --json to a Commander command.
 */
export function addFormatOption(command: Command): Command {
  command.option("--format <format>", "Output format: text | json | yaml | table", "text");
  return command;
}

/**
 * Resolve the effective OutputFormat from Commander opts.
 */
export function resolveFormat(format?: string): OutputFormat {
  format = (format ?? "text").toLowerCase();
  if (!isValidFormat(format)) {
    throw new Error(`Invalid output format: ${format}`);
  }
  return format as OutputFormat;
}
