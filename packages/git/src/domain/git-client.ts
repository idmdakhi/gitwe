export interface GitClient {
  clone(repository: string, directory: string): Promise<void>;

  fetch(): Promise<void>;

  pull(): Promise<void>;

  push(): Promise<void>;

  checkout(branch: string): Promise<void>;

  createBranch(branch: string): Promise<void>;

  deleteBranch(branch: string): Promise<void>;

  commit(message: string): Promise<void>;

  merge(branch: string): Promise<void>;

  rebase(branch: string): Promise<void>;

  tag(name: string): Promise<void>;
}
