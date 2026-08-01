import type { MergeStrategy } from "#gitwe/domain/valueObjects/merge-strategy";

/** Auto-tagging configuration for a branch type, applied when a branch of this type finishes. */
export interface AutoTagConfig {
  /** Whether to create a tag on finish. */
  readonly enabled: boolean;
  /** Prefix prepended to the branch's short name to form the tag, e.g. `"v"` -> `"v1.2.0"`. Defaults to `"v"`. */
  readonly prefix?: string;
}

/**
 * A "topic" branch type — e.g. `feature`, `release`, `hotfix`, `support`,
 * or any custom name a workflow declares — and the rules that govern it:
 * its name prefix, where it merges to when finished, and how.
 *
 * A `BranchTypeRule`'s `parent` names a {@link BaseBranchRule} that must
 * exist on the owning {@link Workflow}; `Workflow.create` enforces this.
 *
 * An immutable value object: construct via {@link BranchTypeRule.create}.
 *
 * @public
 */
export class BranchTypeRule {
  private constructor(
    public readonly name: string,
    public readonly prefix: string,
    public readonly parent: string,
    public readonly startingPoint: string,
    public readonly upstreamStrategy: MergeStrategy,
    public readonly deleteOnFinish: boolean,
    public readonly keepRemote: boolean,
    public readonly autoTag: AutoTagConfig,
  ) {}

  /**
   * @param props.name - Unique branch type identifier, e.g. `"feature"`.
   * @param props.prefix - Prefix applied to short names, e.g. `"feature/"`.
   * @param props.parent - The base branch this type merges into on finish, e.g. `"develop"`.
   * @param props.startingPoint - The branch new instances are created from. Defaults to `props.parent`. Set this when a type finishes into one base but starts from another (e.g. classic Gitflow's `release`, which finishes into `main` but starts from `develop`).
   * @param props.upstreamStrategy - How the branch is merged into `parent` on finish. Defaults to `"merge"`.
   * @param props.deleteOnFinish - Whether to delete the local branch after a successful finish. Defaults to `true`.
   * @param props.keepRemote - Whether to keep the remote-tracking branch when `deleteOnFinish` deletes the local one. Defaults to `false`.
   * @param props.autoTag - Auto-tagging configuration. Defaults to disabled.
   */
  static create(props: {
    name: string;
    prefix: string;
    parent: string;
    startingPoint?: string;
    upstreamStrategy?: MergeStrategy;
    deleteOnFinish?: boolean;
    keepRemote?: boolean;
    autoTag?: AutoTagConfig;
  }): BranchTypeRule {
    return new BranchTypeRule(
      props.name,
      props.prefix,
      props.parent,
      props.startingPoint ?? props.parent,
      props.upstreamStrategy ?? "merge",
      props.deleteOnFinish ?? true,
      props.keepRemote ?? false,
      props.autoTag ?? { enabled: false },
    );
  }

  /** Whether a full branch name (e.g. `"feature/login"`) belongs to this type, based on its prefix. */
  matches(fullBranchName: string): boolean {
    return fullBranchName.startsWith(this.prefix);
  }

  /** Strips this type's prefix from a full branch name, returning the short name. */
  shortNameOf(fullBranchName: string): string {
    return fullBranchName.startsWith(this.prefix)
      ? fullBranchName.slice(this.prefix.length)
      : fullBranchName;
  }
}
