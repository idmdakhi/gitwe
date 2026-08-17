import type { BaseBranch } from "./base-branch.entity.js";
import type { BranchType } from "./branch-type.entity.js";

export type MergeStrategy = "merge" | "squash" | "rebase";

export interface CliConfig {
  readonly enabled: boolean;
  readonly interactive?: boolean;
  readonly color?: boolean;
  readonly aliases?: Readonly<Record<string, string>>;
}

export interface SquashConfig {
  readonly enabled: boolean;
  readonly default: boolean;
  readonly branchTypes: readonly string[];
}

export interface MergeConfig {
  readonly strategy: MergeStrategy;
  readonly branchTypes?: Readonly<Record<string, MergeStrategy>>;
  readonly deleteOnFinish: readonly string[];
  readonly squash?: SquashConfig;
}

export interface HookConfig {
  readonly enabled: boolean;
  readonly path: string;
}

export type VersionBump = "major" | "minor" | "patch" | "prerelease" | "none";

// domain/entities/versioning-config.entity.ts (جدید)
export interface VersioningConfig {
  enabled: boolean;
  path?: string;
  tagPrefix?: string;
  tagTypes?: readonly string[];
  tagTargets?: readonly string[];
  bumpRules?: {
    major?: readonly string[];
    minor?: readonly string[];
    patch?: readonly string[];
    prerelease?: readonly string[];
  };
  format?: string;
  annotated?: boolean;
  sign?: boolean;
  signingKey?: string;
  pushTags?: boolean;
  autoCommit?: boolean;
  commitMessage?: string;
  prerelease?: {
    enabled: boolean;
    format: string;
    types: readonly string[];
  };
}

export interface PrereleaseConfig {
  enabled: boolean;
  format: string;
  types: readonly string[];
}

export interface ChangelogConfig {
  readonly enabled: boolean;
  readonly path?: string;
}

export interface RemoteConfig {
  readonly name: string;
  readonly autoFetch: boolean;
  readonly fetch: readonly string[];
  readonly autoPush: boolean;
  readonly push: readonly string[];
}

export interface WorkflowConfig {
  readonly version: 1;
  readonly name: string;
  readonly baseBranches: readonly BaseBranch[];
  readonly branchTypes: readonly BranchType[];
  readonly cli?: CliConfig;
  readonly merge?: MergeConfig;
  readonly hooks?: HookConfig;
  readonly versioning?: VersioningConfig;
  readonly changelog?: ChangelogConfig;
  readonly remote?: RemoteConfig;
}
