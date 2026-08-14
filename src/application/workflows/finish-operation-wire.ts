/**
 * Wiring guide / helper for FinishOperation (integration of RFC-0001 + RFC-0002).
 *
 * The real FinishOperation should call these helpers at the appropriate steps
 * instead of hard-coding single-remote push and only three strategies.
 *
 * Typical flow inside FinishOperation.execute / continue:
 *
 *   1. Resolve strategy  → resolveEffectiveStrategy(...)
 *   2. For each target:
 *        result = await runFinishStrategy({ strategy, topicBranch, target, ... })
 *        if (result.useClassicPath) { ... existing merge/squash/rebase code ... }
 *   3. If options.push:
 *        await engineFinishPush(git, logger, config, topicType, targets, { remotes })
 *   4. On --abort:
 *        await abortInProgressStrategy(git, logger)
 *        await stateStore.clear()
 */

import type { GitRepository } from "../interfaces/git-repository.js";
import type { Logger } from "../interfaces/logger.js";
import type { MergeStrategy } from "../../domain/merge-strategy.js";
import type { WorkflowConfigLike, BranchTypeLike } from "../../domain/workflow-remote.js";
import {
  runFinishStrategy,
  resolveEffectiveStrategy,
  resumeFinishStrategy,
  abortInProgressStrategy,
  detectStrategyConflict,
  type FinishStrategyRunnerResult,
} from "./finish-strategy-runner.js";
import { engineFinishPush } from "../engine-multi-remote.js";
import type { MultiPushResult } from "../multi-remote-push.js";

export interface FinishWireContext {
  git: GitRepository;
  logger: Logger;
  config: WorkflowConfigLike;
  topicType: BranchTypeLike;
  topicBranch: string;
  targets: string[];
  /** CLI / resolved overrides */
  strategyOverride?: MergeStrategy;
  branchTypeStrategy?: MergeStrategy | string;
  workflowStrategy?: MergeStrategy | string;
  push?: boolean;
  remotes?: string[];
  tags?: boolean;
  completedSubSteps?: string[];
  markComplete?: (step: string) => Promise<void>;
}

export interface FinishWireIntegrateResult {
  strategy: MergeStrategy;
  results: FinishStrategyRunnerResult[];
  /** True when at least one target used the classic path */
  needsClassicPath: boolean;
}

/**
 * Step: integrate topic into all targets using the resolved strategy.
 */
export async function wireIntegrate(ctx: FinishWireContext): Promise<FinishWireIntegrateResult> {
  const strategy = resolveEffectiveStrategy({
    cliStrategy: ctx.strategyOverride,
    branchTypeStrategy: ctx.branchTypeStrategy,
    workflowStrategy: ctx.workflowStrategy,
  });

  const results: FinishStrategyRunnerResult[] = [];
  let needsClassicPath = false;

  for (const target of ctx.targets) {
    const result = await runFinishStrategy({
      git: ctx.git,
      logger: ctx.logger,
      topicBranch: ctx.topicBranch,
      target,
      strategy,
      completedSubSteps: ctx.completedSubSteps,
      markComplete: ctx.markComplete,
    });
    results.push(result);
    if (result.useClassicPath) needsClassicPath = true;
  }

  return { strategy, results, needsClassicPath };
}

/**
 * Step: push targets (and optional tags) to resolved remotes.
 */
export async function wirePush(ctx: FinishWireContext): Promise<MultiPushResult | undefined> {
  if (!ctx.push) return undefined;

  return engineFinishPush(ctx.git, ctx.logger, ctx.config, ctx.topicType, ctx.targets, {
    remotes: ctx.remotes,
    tags: ctx.tags,
  });
}

/**
 * Step: resume after conflict (--continue).
 */
export async function wireContinue(ctx: FinishWireContext): Promise<FinishWireIntegrateResult> {
  // Same as integrate – strategy-steps skip already-completed sub-steps
  return wireIntegrate(ctx);
}

/**
 * Step: abort in-progress strategy + clear state (caller clears state store).
 */
export async function wireAbort(git: GitRepository, logger: Logger): Promise<void> {
  await abortInProgressStrategy(git, logger);
}

export {
  resolveEffectiveStrategy,
  runFinishStrategy,
  resumeFinishStrategy,
  detectStrategyConflict,
  abortInProgressStrategy,
};
