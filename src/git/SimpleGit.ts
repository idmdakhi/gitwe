// src/git/SimpleGit.ts
import type { Git, CreateBranchOptions, MergeOptions, TagOptions } from "#gitwe/git/Git";
import simpleGit, { SimpleGit } from "simple-git";

export class SimpleGitAdapter implements Git {
  private readonly git: SimpleGit;

  constructor() {
    this.git = simpleGit();
  }

  async currentBranch(): Promise<string> {
    return this.git.revparse(["--abbrev-ref", "HEAD"]);
  }

  async checkout(branch: string): Promise<void> {
    await this.git.checkout(branch);
  }

  async createBranch(options: CreateBranchOptions): Promise<void> {
    await this.git.branch([options.name, options.from]);
  }

  async deleteBranch(branch: string, force = false): Promise<void> {
    await this.git.branch([force ? "-D" : "-d", branch]);
  }

  async merge(options: MergeOptions): Promise<void> {
    await this.git.merge([options.source, options.target]);
  }

  async tag(options: TagOptions): Promise<void> {
    await this.git.tag([options.name]);
  }

  async hasBranch(branch: string): Promise<boolean> {
    const branches = await this.git.branchLocal();
    return branches.all.includes(branch);
  }
}
