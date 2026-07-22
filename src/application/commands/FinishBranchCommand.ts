export interface FinishBranchCommand {
  readonly branchName: string;
  readonly deleteAfterMerge?: boolean;
  readonly pushAfterFinish?: boolean;
  /** If true, validates everything and reports the plan without touching git. */
  readonly dryRun?: boolean;
}

