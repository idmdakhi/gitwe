/**
 * Pre-scan of global flags from raw argv.
 * Runs before Commander so that --config / --cwd / --format etc. are available early.
 */

import { tryLoadWorkflow } from "./context.js";
import type { OutputFormat } from "./options.js";

export interface GlobalOptions {
  config?: string;
  cwd?: string;
  verbose?: boolean;
  dryRun?: boolean;
  format?: "text" | "json" | "yaml" | "table";
  noColor?: boolean;
}

/**
 * Extract well-known global options from argv.
 * Supports both `--flag value` and `--flag=value` forms.
 * Also reads GITWE_CONFIG environment variable (CLI flag wins).
 */
export function preScanGlobals(argv: string[]): GlobalOptions {
  const result: GlobalOptions = {};

  // Environment fallback first (lowest precedence)
  if (process.env.GITWE_CONFIG) {
    result.config = process.env.GITWE_CONFIG;
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    // --config <path> | --config=<path>
    if (arg === "--config" || arg === "-C") {
      const value = argv[i + 1];
      if (value && !value.startsWith("-")) {
        result.config = value;
        i++;
      }
    } else if (arg.startsWith("--config=")) {
      result.config = arg.slice("--config=".length);
    }

    // --cwd <path> | --cwd=<path>
    if (arg === "--cwd") {
      const value = argv[i + 1];
      if (value && !value.startsWith("-")) {
        result.cwd = value;
        i++;
      }
    } else if (arg.startsWith("--cwd=")) {
      result.cwd = arg.slice("--cwd=".length);
    }

    // --verbose / -v
    if (arg === "--verbose" || arg === "-v") {
      result.verbose = true;
    }

    // --dry-run
    if (arg === "--dry-run") {
      result.dryRun = true;
    }

    // --format <fmt> | --format=<fmt>
    if (arg === "--format") {
      const value = argv[i + 1];
      if (value && !value.startsWith("-")) {
        if (isValidFormat(value)) {
          result.format = value;
        }
        i++;
      }
    } else if (arg.startsWith("--format=")) {
      const value = arg.slice("--format=".length);
      if (isValidFormat(value)) {
        result.format = value;
      }
    }

    // legacy --json → treat as --format json
    if (arg === "--json") {
      result.format = "json";
    }

    // --no-color
    if (arg === "--no-color") {
      result.noColor = true;
    }
  }

  return result;
}

export function isValidFormat(value: string): value is OutputFormat {
  return value === "text" || value === "json" || value === "yaml" || value === "table";
}

export function expandCliAliases(argv: string[], aliases: Record<string, string>): string[] {
  if (argv.length === 0) {
    return argv;
  }

  const alias = aliases[argv[0]];

  if (alias === undefined) {
    return argv;
  }

  const replacement = alias.trim().split(/\s+/).filter(Boolean);

  return [...replacement, ...argv.slice(1)];
}

export function resolveCliAliases(argv: string[], globals: GlobalOptions): string[] {
  const root = globals.cwd ?? process.cwd();

  const loaded = tryLoadWorkflow(root, globals);

  if (loaded === undefined) {
    return argv;
  }

  const aliases = loaded.config.cli?.aliases;

  if (aliases === undefined) {
    return argv;
  }

  return expandCliAliases(argv, aliases);
}
