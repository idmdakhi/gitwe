export interface MergeOptions {
  readonly message?: string;
  readonly noFastForward?: boolean;
  readonly squash?: boolean;
}

export interface TagOptions {
  readonly message?: string;
  readonly annotated?: boolean;
}

export interface PushOptions {
  readonly setUpstream?: boolean;
  readonly force?: boolean;
  readonly followTags?: boolean;
  readonly delete?: boolean;
}

export interface AheadBehind {
  readonly ahead: number;
  readonly behind: number;
}

/**
 * Everything the application layer needs from git. Implemented by
 * {@link ShellGitRepository} in infrastructure; use cases never shell
 * out directly, which is what makes them unit-testable with a fake.
 */
export interface GitRepository {
  readonly cwd: string;

  currentBranch(): Promise<string | undefined>;
  listBranches(pattern?: string): Promise<string[]>;
  branchExists(branch: string): Promise<boolean>;
  remoteBranchExists(remote: string, branch: string): Promise<boolean>;
  upstreamOf(branch: string): Promise<string | undefined>;
  aheadBehind(ref: string, base: string): Promise<AheadBehind>;
  isAncestor(ancestor: string, descendant: string): Promise<boolean>;

  isClean(): Promise<boolean>;
  conflictedFiles(): Promise<string[]>;
  mergeInProgress(): Promise<boolean>;

  createBranch(branch: string, startPoint: string): Promise<void>;
  checkout(branch: string): Promise<void>;
  deleteBranch(branch: string, force?: boolean): Promise<void>;
  deleteRemoteBranch(remote: string, branch: string): Promise<void>;
  renameBranch(from: string, to: string): Promise<void>;

  merge(branch: string, options?: MergeOptions): Promise<void>;
  /** Completes an in-progress merge after conflicts have been staged. */
  continueMerge(): Promise<void>;
  abortMerge(): Promise<void>;
  rebase(onto: string): Promise<void>;

  createTag(name: string, options?: TagOptions): Promise<void>;
  tagExists(name: string): Promise<boolean>;

  fetch(remote: string, refspec?: string): Promise<void>;
  push(remote: string, branch: string, options?: PushOptions): Promise<void>;
  remoteExists(remote: string): Promise<boolean>;
}
