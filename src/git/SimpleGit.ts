import simpleGit from "simple-git";

import type { Git, CreateBranchOptions, MergeOptions, TagOptions } from "./Git";

export class SimpleGitAdapter implements Git {
  private readonly git = simpleGit();

  async currentBranch() {
    return "";
  }

  async checkout(branch: string) {}

  async createBranch(options: CreateBranchOptions) {}

  async deleteBranch(branch: string, force = false) {}

  async merge(options: MergeOptions) {}

  async tag(options: TagOptions) {}

  async hasBranch(branch: string) {
    return false;
  }
}
