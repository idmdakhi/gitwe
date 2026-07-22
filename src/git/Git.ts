export interface CreateBranchOptions {
  name: string;
  from: string;
}

export interface MergeOptions {
  source: string;
  target: string;
}

export interface TagOptions {
  name: string;
}

export interface Git {
  currentBranch(): Promise<string>;

  checkout(branch: string): Promise<void>;

  createBranch(options: CreateBranchOptions): Promise<void>;

  deleteBranch(branch: string, force?: boolean): Promise<void>;

  merge(options: MergeOptions): Promise<void>;

  tag(options: TagOptions): Promise<void>;

  hasBranch(branch: string): Promise<boolean>;
}

