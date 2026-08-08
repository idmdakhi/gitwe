export interface CliGlobals {
  verbose?: boolean;
  quiet?: boolean;
}

export function preScanGlobals(argv: string[]): CliGlobals {
  return {
    verbose: argv.includes("--verbose"),
    quiet: argv.includes("--quiet"),
  };
}
