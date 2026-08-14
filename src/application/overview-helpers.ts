/**
 * Helpers for richer overview / status output (Phase 1.1).
 */

import type { GitRepository } from "./interfaces/git-repository.js";
import type { OperationStateStore } from "./interfaces/operation-state.js";
import type { Workflow } from "../domain/workflow.js";

export interface BranchHealth {
  name: string;
  exists: boolean;
  ahead?: number;
  behind?: number;
  upstream?: string;
}

export interface OverviewExtras {
  /** True when an operation is waiting for --continue / --abort */
  operationInProgress: boolean;
  operationStep?: string;
  baseBranches: BranchHealth[];
}

/**
 * Collect extra health information for the overview command.
 */
export async function collectOverviewExtras(
  git: GitRepository,
  workflow: Workflow,
  stateStore: OperationStateStore,
): Promise<OverviewExtras> {
  const operationInProgress = stateStore.exists();
  let operationStep: string | undefined;

  if (operationInProgress) {
    try {
      const state = stateStore.read();
      operationStep = state?.currentStep;
    } catch {
      // ignore malformed state – doctor will catch it
    }
  }

  const baseBranches: BranchHealth[] = [];

  for (const base of workflow.config.baseBranches) {
    const exists = await git.branchExists(base.name);
    const health: BranchHealth = { name: base.name, exists };

    if (exists) {
      try {
        const upstream = await git.upstreamOf?.(base.name);
        if (upstream) {
          health.upstream = upstream;
          const counts = await git.aheadBehind?.(base.name, upstream);
          if (counts) {
            health.ahead = counts.ahead;
            health.behind = counts.behind;
          }
        }
      } catch {
        // remote tracking may not exist – ignore
      }
    }

    baseBranches.push(health);
  }

  return { operationInProgress, operationStep, baseBranches };
}

/**
 * Render a short banner when an operation is in progress.
 */
export function formatOperationBanner(step?: string): string {
  const detail = step ? ` (step: ${step})` : "";
  return `⚠  An operation is in progress${detail}. Use \`gitwe finish --continue\` or \`gitwe finish --abort\`.`;
}
