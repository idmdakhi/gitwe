import { setColorEnabled } from "./output.js";
import type { GlobalOptions } from "./options.js";

/**
 * Topic commands are generated from the workflow definition, so global options
 * must be read from raw argv *before* Commander parses the rest of the line.
 *
 * Supports both `--config path` and `--config=path` forms.
 */
export function preScanGlobals(argv: string[]): GlobalOptions {
  const options: GlobalOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config" || arg === "-C") options.config = argv[i + 1];
    else if (arg.startsWith("--config=")) options.config = arg.slice("--config=".length);
    else if (arg === "--cwd") options.cwd = argv[i + 1];
    else if (arg.startsWith("--cwd=")) options.cwd = arg.slice("--cwd=".length);
    else if (arg === "--verbose" || arg === "-v") options.verbose = true;
    else if (arg === "--no-color") setColorEnabled(false);
  }
  return options;
}
