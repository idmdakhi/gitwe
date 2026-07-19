import type { GitAdapter } from "../../src/git/GitAdapter";
import type { Branch, CreateBranchOptions, MergeOptions, MergeResult } from "../../src/core/types";
import { BranchAlreadyExistsError, BranchNotFoundError } from "../../src/core/errors";

/**
 * Fake GitAdapter that keeps everything in memory. Used to unit-test
 * WorkflowEngine's rule logic without touching the filesystem or
 * spawning real `git` processes — fast, and exactly what the
 * GitAdapter abstraction was built for.
 */
export class InMemoryGitAdapter implements GitAdapter {
  private branches = new Set<string>(["main"]);
  private current = "main";
  private deletedBranches: string[] = [];
  private mergeLog: MergeResult[] = [];
  private tags: string[] = [];
  private pushedRemotes: string[] = [];

  async getCurrentBranch(): Promise<string> {
    return this.current;
  }

  async listBranches(): Promise<Branch[]> {
    return [...this.branches].map((name) => ({
      name,
      isCurrent: name === this.current,
      isRemote: false,
    }));
  }

  async branchExists(name: string): Promise<boolean> {
    return this.branches.has(name);
  }

  async createBranch(name: string, options: CreateBranchOptions = {}): Promise<void> {
    const { from, checkout = true } = options;
    if (this.branches.has(name)) throw new BranchAlreadyExistsError(name);
    if (from && !this.branches.has(from)) throw new BranchNotFoundError(from);

    this.branches.add(name);
    if (checkout) this.current = name;
  }

  async checkout(name: string): Promise<void> {
    if (!this.branches.has(name)) throw new BranchNotFoundError(name);
    this.current = name;
  }

  async merge(source: string, target: string, options: MergeOptions = {}): Promise<MergeResult> {
    if (!this.branches.has(source)) throw new BranchNotFoundError(source);
    if (!this.branches.has(target)) throw new BranchNotFoundError(target);

    this.current = target;
    const result: MergeResult = {
      source,
      target,
      fastForward: options.noFastForward === false,
    };
    this.mergeLog.push(result);
    return result;
  }

  async deleteBranch(name: string): Promise<void> {
    if (!this.branches.has(name)) throw new BranchNotFoundError(name);
    this.branches.delete(name);
    this.deletedBranches.push(name);
  }

  async createTag(name: string): Promise<void> {
    this.tags.push(name);
  }

  async push(remote = "origin"): Promise<void> {
    this.pushedRemotes.push(remote);
  }

  async pull(): Promise<void> {
    // No-op: there's no real remote to pull from in-memory.
  }

  async getCommitInfo(): Promise<{ hash: string; date: Date; author: string; message: string }> {
    return { hash: "deadbeef", date: new Date(0), author: "test", message: "test commit" };
  }

  async getBranchParent(): Promise<string | undefined> {
    return undefined;
  }

  async runCommand(): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return { stdout: "", stderr: "", exitCode: 0 };
  }

  /** Test helper — seed extra branches without going through createBranch. */
  seedBranch(name: string): void {
    this.branches.add(name);
  }

  /** Test helper — inspect which branches were deleted. */
  getDeletedBranches(): readonly string[] {
    return this.deletedBranches;
  }

  /** Test helper — inspect merge history. */
  getMergeLog(): readonly MergeResult[] {
    return this.mergeLog;
  }

  /** Test helper — inspect tags created via createTag. */
  getTags(): readonly string[] {
    return this.tags;
  }

  /** Test helper — inspect remotes pushed to. */
  getPushedRemotes(): readonly string[] {
    return this.pushedRemotes;
  }
}
