/**
 * Remote-aware helpers for the `publish` command (RFC-0001).
 *
 * The real publish command in commands/publish.ts (or topic.ts) should:
 *  1. Accept --remote / --push-to via remoteOptionDefs
 *  2. Call parseRemoteCliOptions
 *  3. Pass result.remotes into publishTopic()
 */

import type { Command } from "commander";
import { parseRemoteCliOptions, remoteOptionDefs } from "../remote-options.js";
import type { PublishOptions } from "../../application/publish-multi-remote.js";

/**
 * Attach --remote and --push-to options to a Commander command.
 */
export function addRemoteOptions(command: Command): Command {
  for (const def of remoteOptionDefs) {
    command.option(def.flags, def.description);
  }
  return command;
}

/**
 * Build PublishOptions from Commander opts.
 */
export function publishOptionsFromCli(opts: {
  remote?: string;
  pushTo?: string;
  pushOption?: string | string[];
}): PublishOptions {
  const { remotes } = parseRemoteCliOptions(opts);

  let pushOptions: string[] | undefined;
  if (opts.pushOption != null) {
    pushOptions = Array.isArray(opts.pushOption) ? opts.pushOption : [opts.pushOption];
  }

  return {
    remotes,
    pushOptions,
  };
}
