/** Global CLI flags accepted anywhere on the command line. */
export interface GlobalOptions {
  /** Path to the workflow definition (`-C` / `--config`). */
  config?: string;
  /** Run as if gitwe was started in this directory (`--cwd`). */
  cwd?: string;
  /** Print every git command gitwe runs (`-v` / `--verbose`). */
  verbose?: boolean;
  /** Simulate the operation without making changes (`--dry-run`). */
  dryRun?: boolean;
  performance?: boolean;
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
  { flags: "--performance", description: "show workflow and step execution timings" },
] as const;
