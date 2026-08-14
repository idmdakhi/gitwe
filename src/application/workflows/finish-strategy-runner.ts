/**
 * FinishStrategyRunner – single entry point used by FinishOperation
 * to execute the chosen merge strategy (RFC-0002).
 *
 * Existing strategies (merge / squash / rebase) are delegated to the
 * classic paths that already live in FinishOperation.
 * New strategies (cherry-pick / rebase-merge) use strategy-steps.ts.
 */

import type { GitRepository } from "../interfaces/git-repository.js";
import type { Logger } from "../interfaces/logger.js";
import type { MergeStrategy } from "../../domain/merge-strategy.js";
import { executeCherryPick, executeRebaseMerge, type StrategyContext } from "./strategy-steps.js";
import { ConflictError } from "../../domain/errors.js";

export interface FinishStrategyRunnerOptions {
  git: GitRepository;
  logger: Logger;
  topicBranch: string;
  target: string;
  strategy: MergeStrategy;
  /** Sub-steps already completed (from operation state – for resume) */
  completedSubSteps?: string[];
  /** Persist a completed sub-step (caller updates operation.json) */
  markComplete?: (step: string) => Promise<void>;
}

export interface FinishStrategyRunnerResult {
  strategy: MergeStrategy;
  done: boolean;
  /** For built-in strategies the runner only signals "use classic path" */
  useClassicPath: boolean;
}

const noopMark = async () => {};

/**
 * Run the integration step for the given strategy against one target.
 *
 * - cherry-pick / rebase-merge → executed here (resumable)
 * - merge / squash / rebase    → returns useClassicPath: true
 *   so FinishOperation keeps using its existing implementation
 */
export async function runFinishStrategy(
  options: FinishStrategyRunnerOptions,
): Promise<FinishStrategyRunnerResult> {
  const {
    git,
    logger,
    topicBranch,
    target,
    strategy,
    completedSubSteps = [],
    markComplete = noopMark,
  } = options;

  const ctx: StrategyContext = {
    git,
    logger,
    topicBranch,
    target,
    completedSubSteps,
    markComplete,
  };

  switch (strategy) {
    case "cherry-pick": {
      const result = await executeCherryPick(ctx);
      return { ...result, useClassicPath: false };
    }
    case "rebase-merge": {
      const result = await executeRebaseMerge(ctx);
      return { ...result, useClassicPath: false };
    }
    case "merge":
    case "squash":
    case "rebase":
      // Classic paths stay inside FinishOperation for now
      return {
        strategy,
        done: false,
        useClassicPath: true,
      };
    default: {
      // Exhaustiveness guard
      const _exhaustive: never = strategy;
      throw new Error(`Unsupported finish strategy: ${_exhaustive}`);
    }
  }
}

/**
 * Resolve which strategy to use for a finish run.
 *
 * Priority:
 * 1. Explicit CLI override (already resolved by resolveFinishStrategy)
 * 2. Branch-type level default (from workflow config)
 * 3. Workflow-level default
 * 4. Hard default: "merge"
 */
export function resolveEffectiveStrategy(options: {
  cliStrategy?: MergeStrategy;
  branchTypeStrategy?: MergeStrategy | string;
  workflowStrategy?: MergeStrategy | string;
}): MergeStrategy {
  if (options.cliStrategy) return options.cliStrategy;

  const fromType = options.branchTypeStrategy;
  if (fromType && isKnownStrategy(fromType)) return fromType;

  const fromWorkflow = options.workflowStrategy;
  if (fromWorkflow && isKnownStrategy(fromWorkflow)) return fromWorkflow;

  return "merge";
}

function isKnownStrategy(value: string): value is MergeStrategy {
  return (
    value === "merge" ||
    value === "squash" ||
    value === "rebase" ||
    value === "cherry-pick" ||
    value === "rebase-merge"
  );
}

/**
 * Helper for FinishOperation --continue path.
 * Re-runs the strategy using the persisted completedSubSteps list.
 */
export async function resumeFinishStrategy(
  options: FinishStrategyRunnerOptions,
): Promise<FinishStrategyRunnerResult> {
  // Same as run – strategy-steps already skip completed sub-steps
  return runFinishStrategy(options);
}

/**
 * Detect whether the repository is currently in a conflicted state
 * that belongs to one of the new strategies.
 */
export async function detectStrategyConflict(
  git: GitRepository,
): Promise<{ conflicted: boolean; files: string[] }> {
  try {
    const files = (await git.conflictedFiles?.()) ?? [];
    return { conflicted: files.length > 0, files };
  } catch {
    return { conflicted: false, files: [] };
  }
}

/**
 * Abort helper – reset any in-progress cherry-pick / rebase / merge.
 * Safe to call even when nothing is in progress.
 */
export async function abortInProgressStrategy(git: GitRepository, logger: Logger): Promise<void> {
  const tryRun = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
      logger.debug?.(`abort: ${label} ok`);
    } catch {
      logger.debug?.(`abort: ${label} skipped`);
    }
  };

  await tryRun("cherry-pick --abort", async () => {
    await (git as any).cherryPickAbort?.();
  });
  await tryRun("rebase --abort", async () => {
    await (git as any).abortRebase?.(); // استفاده از abortRebase موجود
  });
  await tryRun("merge --abort", async () => {
    await (git as any).abortMerge?.(); // استفاده از abortMerge موجود
  });
}

// Re-export ConflictError for FinishOperation convenience
export { ConflictError };
