import { setColorEnabled } from "./output.js";
import type { GlobalOptions } from "./options.js";

/**
 * Pre‑scan global flags from raw argv before Commander parses the rest.
 * Supports both `--config path` and `--config=path` forms.
 */
export function preScanGlobals(argv: string[]): GlobalOptions {
  const options: GlobalOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config" || arg === "-C") {
      options.config = argv[i + 1];
      i += 1;
    } else if (arg.startsWith("--config=")) {
      options.config = arg.slice("--config=".length);
    } else if (arg === "--cwd") {
      options.cwd = argv[i + 1];
      i += 1;
    } else if (arg.startsWith("--cwd=")) {
      options.cwd = arg.slice("--cwd=".length);
    } else if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg === "--no-color") {
      setColorEnabled(false);
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--format" && argv[i + 1]) {
      options.format = argv[i + 1] as GlobalOptions["format"];
      i += 1;
    } else if (arg.startsWith("--format=")) {
      options.format = arg.slice("--format=".length) as GlobalOptions["format"];
    }
  }
  // Support GITWE_CONFIG environment variable
  if (!options.config && process.env.GITWE_CONFIG) {
    options.config = process.env.GITWE_CONFIG;
  }
  return options;
}
