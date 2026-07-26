import type { MergeStrategy } from "#gitwe/domain/valueObjects/MergeStrategy";

export interface FinishBranchCommand {
  readonly branchName: string;
  readonly deleteAfterMerge?: boolean;
  readonly pushAfterFinish?: boolean;
  /** If true, validates everything and reports the plan without touching git. */
  readonly dryRun?: boolean;
  /** Overrides the workflow's configured merge strategy for this invocation only. */
  readonly strategy?: MergeStrategy;
}
