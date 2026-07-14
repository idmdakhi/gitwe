export interface Branch {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
}

export interface CreateBranchOptions {
  /** Branch (or commit-ish) to base the new branch on. Defaults to current HEAD. */
  from?: string;
  /** Check out the branch immediately after creating it. Defaults to true. */
  checkout?: boolean;
}

export interface MergeOptions {
  /** Use --no-ff to always create a merge commit, even for fast-forward merges. Defaults to true. */
  noFastForward?: boolean;
  /** Commit message for the merge commit. */
  message?: string;
}

export interface MergeResult {
  target: string;
  source: string;
  fastForward: boolean;
}
