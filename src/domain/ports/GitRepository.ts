import { Branch } from "#gitwe/domain/entities/Branch";
import { MergeOutcome } from "#gitwe/domain/valueObjects/MergeOutcome";
import { CommitInfo } from "#gitwe/domain/valueObjects/CommitInfo";
import type { MergeStrategy } from "#gitwe/domain/valueObjects/MergeStrategy";

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
  /** Merge strategy: a regular merge commit, a squash commit, or a rebase-then-fast-forward. Defaults to "merge". */
  strategy?: MergeStrategy;
}

export interface RawCommandResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

/**
 * The single port through which every layer above infrastructure talks to
 * git. There is exactly one of these in the codebase — no parallel
 * "GitAdapter"/"GitRepository" interfaces with slightly different shapes.
 * `infrastructure/git/ShellGitRepository` is the only implementation today;
 * a libgit2 or GitHub-API-backed implementation could be dropped in later
 * without touching `domain` or `application`.
 */
export interface GitRepository {
  getCurrentBranch(): Promise<string>;
  listBranches(): Promise<Branch[]>;
  branchExists(name: string): Promise<boolean>;
  createBranch(name: string, options?: CreateBranchOptions): Promise<void>;
  checkout(name: string): Promise<void>;
  /** Merges `source` into `target`, checking out `target` first if needed. */
  merge(source: string, target: string, options?: MergeOptions): Promise<MergeOutcome>;
  /** Deletes a local branch. Refuses if unmerged, like `git branch -d`, unless `force` is set. */
  deleteBranch(name: string, force?: boolean): Promise<void>;
  createTag(name: string, message?: string): Promise<void>;
  push(remote?: string, branch?: string): Promise<void>;
  pull(remote?: string, branch?: string): Promise<void>;
  getCommitInfo(ref: string): Promise<CommitInfo>;
  /** Most-recent-first commit history for `ref`, up to `limit` commits (default 10). */
  getRecentCommits(ref: string, limit?: number): Promise<CommitInfo[]>;
  getBranchParent(branch: string): Promise<string | undefined>;
  /** True if every commit reachable from `branch` is also reachable from `into` (i.e. merging would be a no-op). */
  isMerged(branch: string, into: string): Promise<boolean>;
  isWorkingTreeClean(): Promise<boolean>;
  /** Escape hatch for operations not otherwise modeled (used sparingly, e.g. `merge --abort`). */
  runRaw(args: string[]): Promise<RawCommandResult>;
}
