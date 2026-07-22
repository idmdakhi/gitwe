import type { Git, CreateBranchOptions, MergeOptions, TagOptions } from "./Git";

export class GitRepository {
  constructor(private readonly git: Git) {}

  currentBranch() {
    return this.git.currentBranch();
  }

  checkout(branch: string) {
    return this.git.checkout(branch);
  }

  createBranch(options: CreateBranchOptions) {
    return this.git.createBranch(options);
  }

  deleteBranch(branch: string, force = false) {
    return this.git.deleteBranch(branch, force);
  }

  merge(options: MergeOptions) {
    return this.git.merge(options);
  }

  tag(options: TagOptions) {
    return this.git.tag(options);
  }

  hasBranch(branch: string) {
    return this.git.hasBranch(branch);
  }
}

