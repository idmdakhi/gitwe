export interface MergeOptions {
  readonly message?: string;
  readonly noFastForward?: boolean;
  readonly squash?: boolean;
}

export interface TagOptions {
  readonly message?: string;
  readonly annotated?: boolean;
  readonly sign?: boolean;
  readonly signingKey?: string;
}

export interface PushOptions {
  /** Set upstream tracking (--set-upstream) */
  readonly setUpstream?: boolean;
  /** Force push (--force) - use with caution */
  readonly force?: boolean;
  /** Force push with lease (--force-with-lease) - safer than --force */
  readonly forceWithLease?: boolean;
  /** Push tags along with branches (--follow-tags) */
  readonly followTags?: boolean;
  /** Delete remote branch (--delete) */
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
  setUpstream(branch: string, remote: string): Promise<void>;
  listTags(): Promise<string[]>;
  deleteTag(name: string): Promise<void>;
  pushTags(remote: string, pattern?: string): Promise<void>;
  deleteRemoteTag(remote: string, name: string): Promise<void>;
  /** Run an arbitrary git command and return stdout. */
  raw(args: string[]): Promise<string>;
  graph(root?: string): Promise<string>;
}
