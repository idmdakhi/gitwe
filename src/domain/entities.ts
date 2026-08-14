import { MergeStrategy } from "./merge-strategy.js";
import type { RemoteConfig } from "./remote.js";

/** A long-lived branch of the workflow. */
export interface BaseBranch {
  name: string;
  aliases?: string[];
  /** Parent branch (base branch it integrates into) */
  base?: string;
  /** Protect this branch from direct deletion */
  protected?: boolean;
}

/** A short-lived branch category. */
export interface BranchType {
  name: string;
  aliases?: string[];
  /** Branch new topics are created from */
  base: string;
  /** Base branch(es) this type is finished into */
  target: string[];
  prefix: string;
}

export interface HookConfig {
  enabled: boolean;
  path: string;
}

export interface VersioningConfig {
  enabled: boolean;
  initialVersion?: string;
  path?: string;
  tagPrefix: string;
  format?: string;
  tag: string[];
  branchTypes?: {
    version?: string[];
    major?: string[];
    minor?: string[];
    patch?: string[];
    metadata?: string[];
  };
  annotated?: boolean;
  pushTags?: boolean;
  changelog?: {
    enabled: boolean;
    path?: string;
  };
  // فیلدهای جدید
  autoCommit?: boolean;
  bumpRules?: Record<string, string[]>;
  commitMessage?: string;
  prerelease?: {
    enabled: boolean;
    format?: string;
    types?: string[];
  };
}

export interface MergeConfig {
  strategy: MergeStrategy;
  /** Per-branch-type strategies: string | string[] */
  branchTypes: Record<string, string | string[]>;
  /** Array of branch type names that should be deleted after finish */
  deleteOnFinish: string[];
  squash?: {
    /** Array of branch type names that allow squash */
    branchTypes: string[];
    enabled: boolean;
    default: boolean;
  };
}

export interface CliConfig {
  enabled: boolean;
  interactive?: boolean;
  color?: boolean;
  aliases?: Record<string, string>;
}

export interface WorkflowConfig {
  version: 1;
  name: string;
  baseBranches: BaseBranch[];
  branchTypes: BranchType[];
  hooks?: HookConfig;
  cli?: CliConfig;
  merge?: MergeConfig;
  versioning?: VersioningConfig;
  remote?: RemoteConfig;
}

/** A topic branch resolved against the workflow definition. */
export interface ResolvedBranch {
  /** Full git branch name, e.g. `feature/login`. */
  branch: string;
  /** Name without the type prefix, e.g. `login`. */
  shortName: string;
  type: BranchType;
}

export interface BranchStatus {
  name: string;
  current: boolean;
  ahead: number;
  behind: number;
  upstream?: string;
}
