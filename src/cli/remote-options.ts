/**
 * Shared CLI options for multi-remote overrides (RFC-0001).
 *
 * Flags:
 *   --remote <name>          Push/publish to a single remote (overrides config)
 *   --push-to <r1,r2,...>    Push/publish to an explicit list of remotes
 *
 * --push-to wins over --remote when both are present.
 */

export interface RemoteCliOptions {
  /** Resolved list of remotes, or undefined = use workflow config */
  remotes?: string[];
}

/**
 * Parse --remote / --push-to from an options object produced by Commander.
 */
export function parseRemoteCliOptions(opts: {
  remote?: string;
  pushTo?: string;
}): RemoteCliOptions {
  if (opts.pushTo != null && opts.pushTo.trim() !== "") {
    const list = opts.pushTo
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length > 0) return { remotes: list };
  }

  if (opts.remote != null && opts.remote.trim() !== "") {
    return { remotes: [opts.remote.trim()] };
  }

  return {};
}

/**
 * Commander option definitions that can be attached to publish / finish.
 *
 * Usage:
 *   command
 *     .option("--remote <name>", "Push to a single remote (overrides config)")
 *     .option("--push-to <remotes>", "Comma-separated remotes to push to (overrides config)");
 */
export const remoteOptionDefs = [
  {
    flags: "--remote <name>",
    description: "Push/publish to a single remote (overrides workflow config)",
  },
  {
    flags: "--push-to <remotes>",
    description:
      "Comma-separated list of remotes to push to, e.g. origin,mirror (overrides config)",
  },
] as const;
