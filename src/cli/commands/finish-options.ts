/**
 * Combined CLI option helpers for `gitwe finish`.
 *
 * Usage in the real finish command:
 *
 *   import { addFinishOptions, resolveFinishOptions } from "./finish-options.js";
 *
 *   const cmd = program.command("finish")...
 *   addFinishOptions(cmd);
 *   cmd.action(async (opts) => {
 *     const { strategy, remotes, format } = resolveFinishOptions(opts);
 *     ...
 *   });
 */

import type { Command } from "commander";
import { addRemoteOptions } from "./publish-remote.js";
import { addStrategyOptions, resolveFinishStrategy } from "./finish-strategy.js";
import { finishRemoteOverride } from "./finish-remote.js";
import { addFormatOption, resolveFormat, type OutputFormat } from "../options.js";
import type { MergeStrategy } from "../../domain/merge-strategy.js";

/**
 * Attach all finish-related options (strategy, remote, format).
 */
export function addFinishOptions(command: Command): Command {
  addStrategyOptions(command);
  addRemoteOptions(command);
  addFormatOption(command);
  return command;
}

export interface ResolvedFinishOptions {
  strategy?: MergeStrategy;
  remotes?: string[];
  format: OutputFormat;
}

/**
 * Resolve strategy + remote + format overrides from Commander opts.
 */
export function resolveFinishOptions(opts: {
  strategy?: string;
  cherryPick?: boolean;
  rebaseMerge?: boolean;
  squash?: boolean;
  rebase?: boolean;
  remote?: string;
  pushTo?: string;
  push?: boolean;
  format?: string;
  json?: boolean;
}): ResolvedFinishOptions {
  const { strategy } = resolveFinishStrategy(opts);
  const remotes = finishRemoteOverride(opts);
  const format = resolveFormat(opts.format);
  return { strategy, remotes, format };
}
