import type { Branch, CreateBranchOptions, MergeOptions, MergeResult } from "../core/types";

/**
 * GitAdapter is the boundary between the workflow engine and the actual
 * `git` binary. Every other layer (rules, CLI, etc.) talks to this
 * interface instead of shelling out directly — that keeps the engine
 * testable (fake adapters in unit tests) and lets us swap the
 * implementation later (e.g. libgit2 bindings) without touching the
 * rest of the codebase.
 */
export interface GitAdapter {
  /** Name of the branch currently checked out. */
  getCurrentBranch(): Promise<string>;

  /** All local branches. */
  listBranches(): Promise<Branch[]>;

  /** Whether a branch with this name exists locally. */
  branchExists(name: string): Promise<boolean>;

  /** Create a new branch, optionally from a given ref, optionally checking it out. */
  createBranch(name: string, options?: CreateBranchOptions): Promise<void>;

  /** Check out an existing branch. */
  checkout(name: string): Promise<void>;

  /** Merge `source` into `target`. Checks out `target` first if not already on it. */
  merge(source: string, target: string, options?: MergeOptions): Promise<MergeResult>;

  /** Delete a local branch. Refuses (like plain `git branch -d`) if it isn't fully merged, unless `force` is set. */
  deleteBranch(name: string, force?: boolean): Promise<void>;
  createTag(name: string, message?: string): Promise<void>;
  push(remote?: string, branch?: string): Promise<void>;
  pull(remote?: string, branch?: string): Promise<void>;
  getCommitInfo(
    ref: string,
  ): Promise<{ hash: string; date: Date; author: string; message: string }>;
  getBranchParent(branch: string): Promise<string | undefined>;
  runCommand(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }>;
}
