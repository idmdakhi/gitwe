import { Branch } from "#gitwe/domain/entities/Branch";
import { MergeOutcome } from "#gitwe/domain/valueObjects/MergeOutcome";
import { CommitInfo } from "#gitwe/domain/valueObjects/CommitInfo";

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
  getBranchParent(branch: string): Promise<string | undefined>;
  isWorkingTreeClean(): Promise<boolean>;
  /** Escape hatch for operations not otherwise modeled (used sparingly, e.g. `merge --abort`). */
  runRaw(args: string[]): Promise<RawCommandResult>;
}
