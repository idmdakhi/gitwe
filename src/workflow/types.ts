export interface StartBranchOptions {
  type: string;

  name: string;
}

export interface FinishBranchOptions {
  branch: string;
}

export interface Workflow {
  startBranch(options: StartBranchOptions): Promise<void>;

  finishBranch(options: FinishBranchOptions): Promise<void>;
}
