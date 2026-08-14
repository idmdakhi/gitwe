/**
 * CLI strategy flags for `gitwe finish` (RFC-0002).
 *
 * Supported:
 *   --strategy <name>     Explicit strategy (merge|squash|rebase|cherry-pick|rebase-merge)
 *   --cherry-pick         Shortcut for --strategy cherry-pick
 *   --rebase-merge        Shortcut for --strategy rebase-merge
 *   --squash              Existing shortcut (kept for compatibility)
 *   --rebase              Existing shortcut (kept for compatibility)
 *
 * Precedence when multiple flags are present:
 *   1. --strategy <name>
 *   2. --cherry-pick / --rebase-merge / --squash / --rebase
 *   3. workflow default
 */

import type { Command } from "commander";
import { isMergeStrategy, type MergeStrategy } from "../../domain/merge-strategy.js";
import { ValidationError } from "../../domain/errors.js";

export interface FinishStrategyCliOptions {
  strategy?: MergeStrategy;
}

/**
 * Attach strategy-related options to the finish command.
 */
export function addStrategyOptions(command: Command): Command {
  command
    .option(
      "--strategy <name>",
      "Merge strategy: merge | squash | rebase | cherry-pick | rebase-merge",
    )
    .option("--cherry-pick", "Shortcut for --strategy cherry-pick", false)
    .option("--rebase-merge", "Shortcut for --strategy rebase-merge", false)
    .option("--squash", "Shortcut for --strategy squash", false)
    .option("--rebase", "Shortcut for --strategy rebase", false);
  return command;
}

/**
 * Resolve the effective strategy from Commander opts.
 * Returns undefined when the user did not request an override
 * (engine should then use the workflow / branch-type default).
 */
export function resolveFinishStrategy(opts: {
  strategy?: string;
  cherryPick?: boolean;
  rebaseMerge?: boolean;
  squash?: boolean;
  rebase?: boolean;
}): FinishStrategyCliOptions {
  // 1. Explicit --strategy wins
  if (opts.strategy != null && opts.strategy.trim() !== "") {
    const name = opts.strategy.trim().toLowerCase();
    if (!isMergeStrategy(name)) {
      throw new ValidationError(
        `Unknown strategy "${opts.strategy}"`,
        "Valid values: merge, squash, rebase, cherry-pick, rebase-merge",
      );
    }
    return { strategy: name };
  }

  // 2. Shortcut flags (first match in a fixed priority order)
  if (opts.cherryPick) return { strategy: "cherry-pick" };
  if (opts.rebaseMerge) return { strategy: "rebase-merge" };
  if (opts.squash) return { strategy: "squash" };
  if (opts.rebase) return { strategy: "rebase" };

  // 3. No override
  return {};
}
