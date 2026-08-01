/** How a topic branch is integrated into its parent branch. */
export type MergeStrategy = "merge" | "squash" | "rebase";

/** How a branch is brought up to date with its parent branch. */
export type UpdateStrategy = "merge" | "rebase";

/**
 * A long-lived branch of the workflow (`main`, `develop`, `staging`, ...).
 * Base branches form a tree: `parent` points at the branch they integrate into.
 */
export interface BaseBranch {
  name: string;
  parent?: string;
  upstreamStrategy: MergeStrategy;
  downstreamStrategy: UpdateStrategy;
  /** Update this branch from its parent whenever the parent receives a finish. */
  autoUpdate: boolean;
}

/** A short-lived branch category (`feature`, `release`, `hotfix`, ...). */
export interface TopicType {
  name: string;
  /** Base branch this type is finished into. */
  parent: string;
  prefix: string;
  /** Branch new topics are created from; defaults to `parent`. */
  startPoint?: string;
  upstreamStrategy: MergeStrategy;
  downstreamStrategy: UpdateStrategy;
  /** Create a tag on the parent branch when a topic of this type is finished. */
  tag: boolean;
  tagPrefix?: string;
  /** Delete the topic branch after a successful finish. */
  deleteOnFinish: boolean;
}

export interface HookConfig {
  enabled: boolean;
  /** Directory holding executable hook scripts, relative to the repository root. */
  path: string;
}

/** A complete workflow definition: the engine's only source of truth. */
export interface WorkflowConfig {
  version: 1;
  name: string;
  remote: string;
  tagPrefix: string;
  baseBranches: BaseBranch[];
  topicTypes: TopicType[];
  hooks: HookConfig;
}

/** A topic branch resolved against the workflow definition. */
export interface ResolvedTopic {
  /** Full git branch name, e.g. `feature/login`. */
  branch: string;
  /** Name without the type prefix, e.g. `login`. */
  shortName: string;
  type: TopicType;
}

export interface BranchStatus {
  name: string;
  current: boolean;
  ahead: number;
  behind: number;
  upstream?: string;
}
