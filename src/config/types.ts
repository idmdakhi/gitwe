export type WorkflowType = "git-flow";

export type MergeStrategy = "merge" | "squash" | "rebase";

export type BranchCase = "kebab-case" | "camelCase" | "snake_case";

export interface BranchConfig {
  protected?: boolean;
}

export interface BranchTypeConfig {
  prefix: string;

  base: string;

  target: string | string[];

  deleteAfterFinish?: boolean;

  tag?: boolean;
}

export interface MergeConfig {
  strategy: MergeStrategy;

  deleteSource: boolean;
}

export interface TagConfig {
  enabled: boolean;

  prefix: string;
}

export interface ConventionalCommitConfig {
  enabled: boolean;
}

export interface CommitConfig {
  conventional: ConventionalCommitConfig;
}

export interface BranchNamingConfig {
  case: BranchCase;

  maxLength: number;
}

export interface GitweConfig {
  version: number;

  workflow: WorkflowType;

  branches: Record<string, BranchConfig>;

  types: Record<string, BranchTypeConfig>;

  merge: MergeConfig;

  tag: TagConfig;

  commit: CommitConfig;

  branchNaming: BranchNamingConfig;
}

