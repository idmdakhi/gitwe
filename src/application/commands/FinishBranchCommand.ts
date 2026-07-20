export interface FinishBranchCommand {
  readonly branchName: string;
  readonly deleteAfterMerge?: boolean;
  readonly pushAfterFinish?: boolean;
}
