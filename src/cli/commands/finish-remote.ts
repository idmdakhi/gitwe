/**
 * Remote-aware helpers for the `finish` command (RFC-0001).
 *
 * When finish is called with --push, the resolved remotes (from config or
 * --remote / --push-to) are passed to the push step via multi-remote-push.
 */

import type { Command } from "commander";
import { parseRemoteCliOptions, remoteOptionDefs } from "../remote-options.js";
import { addRemoteOptions } from "./publish-remote.js";

export { addRemoteOptions };

/**
 * Extract remote override from finish CLI options.
 * Returns undefined when the user did not pass --remote / --push-to
 * (engine should then use workflow config).
 */
export function finishRemoteOverride(opts: {
  remote?: string;
  pushTo?: string;
  push?: boolean;
}): string[] | undefined {
  // Only relevant when --push is active
  if (!opts.push) return undefined;
  return parseRemoteCliOptions(opts).remotes;
}
