import { Branch } from "#gitwe/domain/entities/branch";
import type { MergeOutcome, CommitInfo, AheadBehind } from "#gitwe/domain/valueObjects/commit-info";
import type { MergeStrategy, UpdateStrategy } from "#gitwe/domain/valueObjects/merge-strategy";

/** Options for {@link GitRepository.createBranch}. */
export interface CreateBranchOptions {
  /** Branch (or commit-ish) to base the new branch on. Defaults to the current `HEAD`. */
  from?: string;
  /** Whether to check out the branch immediately after creating it. Defaults to `true`. */
  checkout?: boolean;
}

/** Options for {@link GitRepository.merge}. */
export interface MergeOptions {
  /** Use `--no-ff` to always create a merge commit, even for fast-forward merges. Defaults to `true`. */
  noFastForward?: boolean;
  /** Commit message for the merge commit. */
  message?: string;
  /** Merge strategy. Defaults to `"merge"`. */
  strategy?: MergeStrategy;
}

/** Options for {@link GitRepository.push}. */
export interface PushOptions {
  /** Create/update the remote-tracking relationship (`git push -u`). Defaults to `false`. */
  setUpstream?: boolean;
  /** Also push tags (`git push --tags`). Defaults to `false`. */
  tags?: boolean;
}

/** Raw result of an escape-hatch git invocation via {@link GitRepository.runRaw}. */
export interface RawCommandResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

/**
 * The single port through which every layer above infrastructure talks to
 * git. There is exactly one git-facing interface in this codebase, so
 * consumers only ever need to implement or mock one contract.
 *
 * `infrastructure/git/ShellGitRepository` is the default implementation,
 * shelling out to the system `git` binary.
 *
 * @public
 */
export interface GitRepository {
  /** Returns the name of the currently checked-out branch. */
  getCurrentBranch(): Promise<string>;
  /** Lists all local and remote-tracking branches. */
  listBranches(): Promise<Branch[]>;
  /** Returns whether a branch with this name exists locally. */
  branchExists(name: string): Promise<boolean>;
  /** Returns whether `name` exists on `remote`. */
  remoteBranchExists(remote: string, name: string): Promise<boolean>;
  /** Creates a new branch. */
  createBranch(name: string, options?: CreateBranchOptions): Promise<void>;
  /** Checks out an existing local branch. */
  checkout(name: string): Promise<void>;
  /**
   * Creates a local branch tracking `remote/name` and checks it out —
   * the git-native equivalent of `git checkout --track remote/name`.
   */
  createTrackingBranch(name: string, remote: string): Promise<void>;
  /** Renames a branch, updating the current branch if it's the one being renamed. */
  renameBranch(oldName: string, newName: string): Promise<void>;
  /** Merges `source` into `target`, checking out `target` first if it isn't already checked out. */
  merge(source: string, target: string, options?: MergeOptions): Promise<MergeOutcome>;
  /** Rebases `branch` onto `onto`, checking out `branch` first if needed. Leaves `branch` checked out. */
  rebase(branch: string, onto: string): Promise<void>;
  /** Deletes a local branch. Refuses if unmerged (like `git branch -d`) unless `force` is set. */
  deleteBranch(name: string, force?: boolean): Promise<void>;
  /** Deletes a branch on `remote`. A no-op (does not throw) if it doesn't exist there. */
  deleteRemoteBranch(remote: string, name: string): Promise<void>;
  /** Creates a tag, optionally annotated with `message`. */
  createTag(name: string, message?: string): Promise<void>;
  /** Fetches refs from a remote without merging. */
  fetch(remote?: string): Promise<void>;
  /** Pushes a branch (or the current branch) to a remote. */
  push(remote?: string, branch?: string, options?: PushOptions): Promise<void>;
  /** Pulls a branch (or the current branch) from a remote, using `strategy` to reconcile (`"rebase"` -> `git pull --rebase`). */
  pull(remote?: string, branch?: string, strategy?: UpdateStrategy): Promise<void>;
  /** Returns commit metadata for a single ref. */
  getCommitInfo(ref: string): Promise<CommitInfo>;
  /** Most-recent-first commit history for `ref`, up to `limit` commits (default 10). */
  getRecentCommits(ref: string, limit?: number): Promise<CommitInfo[]>;
  /** True if every commit reachable from `branch` is also reachable from `into` (i.e. merging would be a no-op). */
  isMerged(branch: string, into: string): Promise<boolean>;
  /** Returns whether the working tree has no uncommitted changes. */
  isWorkingTreeClean(): Promise<boolean>;
  /** Returns the remote-tracking branch a local branch is linked to, if any (e.g. `"origin/main"`). */
  getUpstream(branch: string): Promise<string | undefined>;
  /** Returns how far `branch` has diverged from `remote/branch`. Both counts are `0` if there is no upstream. */
  getAheadBehind(branch: string, remote: string): Promise<AheadBehind>;
  /**
   * Escape hatch for git operations not otherwise modeled by this
   * interface. Prefer a typed method above whenever one exists.
   */
  runRaw(args: string[]): Promise<RawCommandResult>;
}
