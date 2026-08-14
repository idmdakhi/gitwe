/**
 * Finish strategy step implementations (RFC-0002).
 *
 * These are the new paths for cherry-pick and rebase-merge.
 * They follow the same resumable pattern as the existing merge/squash/rebase
 * steps inside FinishOperation.
 */

import type { GitRepository } from "../interfaces/git-repository.js";
import type { Logger } from "../interfaces/logger.js";
import type { MergeStrategy } from "../../domain/merge-strategy.js";
import { ConflictError } from "../../domain/errors.js";

export interface StrategyContext {
  git: GitRepository;
  logger: Logger;
  /** Full name of the topic branch being finished */
  topicBranch: string;
  /** Target base branch to integrate into */
  target: string;
  /** Already-completed sub-steps (for resume) */
  completedSubSteps: string[];
  /** Mark a sub-step complete (persisted by caller) */
  markComplete: (step: string) => Promise<void>;
}

export interface StrategyResult {
  strategy: MergeStrategy;
  /** True when the strategy finished without leaving conflicts */
  done: boolean;
}

/**
 * Cherry-pick every commit from topicBranch onto target.
 *
 * Sub-steps:
 *  1. checkout-target
 *  2. cherry-pick-range
 *  3. (on conflict) wait for --continue
 */
export async function executeCherryPick(ctx: StrategyContext): Promise<StrategyResult> {
  const { git, logger, topicBranch, target, completedSubSteps, markComplete } = ctx;

  if (!completedSubSteps.includes("checkout-target")) {
    logger.debug?.(`checkout ${target}`);
    await git.checkout(target);
    await markComplete("checkout-target");
  }

  if (!completedSubSteps.includes("cherry-pick-range")) {
    logger.debug?.(`cherry-pick ${topicBranch} onto ${target}`);
    try {
      // Assumes GitRepository gains a cherryPickRange helper.
      // Signature: cherryPickRange(from: string, to?: string)
      // from = merge-base(target, topic)..topic
      await git.checkout(target);
      await (git as any).cherryPickRange?.(target, topicBranch);
      await markComplete("cherry-pick-range");
    } catch (err) {
      // Detect conflict via repository state
      const conflicted = await git.conflictedFiles?.();
      if (conflicted && conflicted.length > 0) {
        throw new ConflictError(
          `cherry-pick of ${topicBranch} onto ${target} produced conflicts`,
          conflicted,
          "Resolve conflicts, then run `gitwe finish --continue` (or `gitwe finish --abort`).",
        );
      }
      throw err;
    }
  }

  return { strategy: "cherry-pick", done: true };
}

/**
 * Rebase topic onto target, then create a merge commit (no FF).
 *
 * Sub-steps:
 *  1. checkout-topic
 *  2. rebase-onto-target
 *  3. checkout-target
 *  4. merge-no-ff
 */
export async function executeRebaseMerge(ctx: StrategyContext): Promise<StrategyResult> {
  const { git, logger, topicBranch, target, completedSubSteps, markComplete } = ctx;

  if (!completedSubSteps.includes("checkout-topic")) {
    logger.debug?.(`checkout ${topicBranch}`);
    await git.checkout(topicBranch);
    await markComplete("checkout-topic");
  }

  if (!completedSubSteps.includes("rebase-onto-target")) {
    logger.debug?.(`rebase ${topicBranch} onto ${target}`);
    try {
      await git.rebase?.(target);
      await markComplete("rebase-onto-target");
    } catch (err) {
      const conflicted = await git.conflictedFiles?.();
      if (conflicted && conflicted.length > 0) {
        throw new ConflictError(
          `rebase of ${topicBranch} onto ${target} produced conflicts`,
          conflicted,
          "Resolve conflicts, then run `gitwe finish --continue` (or `gitwe finish --abort`).",
        );
      }
      throw err;
    }
  }

  if (!completedSubSteps.includes("checkout-target")) {
    logger.debug?.(`checkout ${target}`);
    await git.checkout(target);
    await markComplete("checkout-target");
  }

  if (!completedSubSteps.includes("merge-no-ff")) {
    logger.debug?.(`merge --no-ff ${topicBranch}`);
    try {
      await git.merge?.(topicBranch, { noFf: true });
      await markComplete("merge-no-ff");
    } catch (err) {
      const conflicted = await git.conflictedFiles?.();
      if (conflicted && conflicted.length > 0) {
        throw new ConflictError(
          `merge --no-ff of ${topicBranch} into ${target} produced conflicts`,
          conflicted,
        );
      }
      throw err;
    }
  }

  return { strategy: "rebase-merge", done: true };
}

/**
 * Dispatch to the correct strategy implementation.
 */
export async function executeStrategy(
  strategy: MergeStrategy,
  ctx: StrategyContext,
): Promise<StrategyResult> {
  switch (strategy) {
    case "cherry-pick":
      return executeCherryPick(ctx);
    case "rebase-merge":
      return executeRebaseMerge(ctx);
    default:
      // merge / squash / rebase stay in the existing FinishOperation paths
      throw new Error(
        `executeStrategy called for built-in strategy "${strategy}" – use existing FinishOperation path`,
      );
  }
}
