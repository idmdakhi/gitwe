import type { MergeStrategy } from "#gitwe/domain/valueObjects/MergeStrategy";
import type { UpdateStrategy } from "#gitwe/domain/valueObjects/UpdateStrategy";
import type { VersionBump } from "#gitwe/domain/valueObjects/VersionBump";

/** Auto-tagging configuration for a branch type (e.g. releases). */
export interface AutoTagConfig {
  /** Prefix for the tag, e.g. "v" -> "v1.2.0". Defaults to "v". */
  readonly prefix?: string;
  /** Regex used to extract the version from the branch's short name. Defaults to using it as-is. */
  readonly pattern?: string;
}

/**
 * A branch type (e.g. feature, release, hotfix) and the rules that govern
 * it: what it's prefixed with, what it's created from, and what it merges
 * into when finished. This is a plain, immutable value object — the
 * `Workflow` aggregate owns a collection of these.
 */
export class BranchTypeRule {
  private constructor(
    public readonly name: string,
    public readonly prefix: string,
    public readonly baseBranch: string,
    public readonly mergeTargets: readonly string[],
    public readonly deleteOnFinish: boolean,
    public readonly autoTag?: AutoTagConfig,
    /** Overrides the workflow's default merge strategy on `finish`, for this branch type only. */
    public readonly mergeStrategy?: MergeStrategy,
    /** How `update` catches this branch type up with its base branch. Defaults to "merge". */
    public readonly downstreamStrategy?: UpdateStrategy,
    public readonly bumpVersion?: VersionBump,
  ) {}

  static create(props: {
    name: string;
    prefix: string;
    baseBranch: string;
    mergeTargets: string[];
    deleteOnFinish?: boolean;
    autoTag?: AutoTagConfig;
    mergeStrategy?: MergeStrategy;
    downstreamStrategy?: UpdateStrategy;
    bumpVersion?: VersionBump;
  }): BranchTypeRule {
    return new BranchTypeRule(
      props.name,
      props.prefix,
      props.baseBranch,
      props.mergeTargets,
      props.deleteOnFinish ?? true,
      props.autoTag,
      props.mergeStrategy,
      props.downstreamStrategy,
      props.bumpVersion ?? "patch",
    );
  }

  matches(fullBranchName: string): boolean {
    return fullBranchName.startsWith(this.prefix);
  }
}
