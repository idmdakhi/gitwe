import type {
  GitRepository,
  CreateBranchOptions,
  MergeOptions,
  RawCommandResult,
} from "#gitwe/domain/ports/GitRepository";
import { Branch } from "#gitwe/domain/entities/Branch";
import { MergeOutcome } from "#gitwe/domain/valueObjects/MergeOutcome";
import { CommitInfo } from "#gitwe/domain/valueObjects/CommitInfo";
import { BranchAlreadyExistsError, BranchNotFoundError } from "#gitwe/domain/errors/index";

export class InMemoryGitRepository implements GitRepository {
  private branches = new Set<string>(["main"]);
  private current = "main";
  private workingTreeClean = true;
  private deletedBranches: string[] = [];
  private mergeLog: MergeOutcome[] = [];
  private tags: string[] = [];
  private pushedRemotes: string[] = [];
  private parents = new Map<string, string>();

  async getCurrentBranch(): Promise<string> {
    return this.current;
  }

  async listBranches(): Promise<Branch[]> {
    return [...this.branches].map((name) => new Branch(name, name === this.current, false));
  }

  async branchExists(name: string): Promise<boolean> {
    return this.branches.has(name);
  }

  async createBranch(name: string, options: CreateBranchOptions = {}): Promise<void> {
    if (this.branches.has(name)) throw new BranchAlreadyExistsError(name);
    this.branches.add(name);
    if (options.from) this.parents.set(name, options.from);
    if (options.checkout !== false) this.current = name;
  }

  async checkout(name: string): Promise<void> {
    if (!this.branches.has(name)) throw new BranchNotFoundError(name);
    this.current = name;
  }

  async merge(source: string, target: string, options: MergeOptions = {}): Promise<MergeOutcome> {
    if (!this.branches.has(source)) throw new BranchNotFoundError(source);
    if (!this.branches.has(target)) throw new BranchNotFoundError(target);
    this.current = target;
    const outcome = MergeOutcome.of(source, target, options.noFastForward === false);
    this.mergeLog.push(outcome);
    return outcome;
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

  async pull(): Promise<void> {}

  async getCommitInfo(): Promise<CommitInfo> {
    return { hash: "deadbeef", date: new Date(0), author: "test", message: "test commit" };
  }

  async getBranchParent(branch: string): Promise<string | undefined> {
    return this.parents.get(branch);
  }

  async isWorkingTreeClean(): Promise<boolean> {
    return this.workingTreeClean;
  }

  async runRaw(): Promise<RawCommandResult> {
    return { stdout: "", stderr: "", exitCode: 0 };
  }

  // --- test helpers ---

  seedBranch(name: string, parent?: string): void {
    this.branches.add(name);
    if (parent) this.parents.set(name, parent);
  }

  setWorkingTreeClean(clean: boolean): void {
    this.workingTreeClean = clean;
  }

  getDeletedBranches(): readonly string[] {
    return this.deletedBranches;
  }

  getMergeLog(): readonly MergeOutcome[] {
    return this.mergeLog;
  }

  getTags(): readonly string[] {
    return this.tags;
  }

  getPushedRemotes(): readonly string[] {
    return this.pushedRemotes;
  }
}
