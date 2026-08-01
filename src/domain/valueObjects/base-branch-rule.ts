import type { UpdateStrategy } from "#gitwe/domain/valueObjects/merge-strategy";

/**
 * A long-lived "base" branch in the workflow (e.g. `main`, `develop`,
 * `staging`) as opposed to a short-lived "topic" branch (e.g. a feature).
 *
 * Base branches can form a hierarchy: `develop.parent === "main"` means
 * that whenever `main` receives new commits from finishing a topic branch
 * (or another base sync), `develop` is a candidate to automatically catch
 * up from `main` too, if {@link BaseBranchRule.autoUpdate} is enabled.
 * This is how, in classic Gitflow, a `hotfix` finished into `main`
 * transparently propagates into `develop` without the hotfix branch ever
 * touching `develop` directly.
 *
 * An immutable value object: construct via {@link BaseBranchRule.create}.
 *
 * @public
 */
export class BaseBranchRule {
  private constructor(
    public readonly name: string,
    public readonly parent: string | undefined,
    public readonly downstreamStrategy: UpdateStrategy,
    public readonly autoUpdate: boolean,
  ) {}

  /**
   * @param props.name - The base branch's name, e.g. `"develop"`.
   * @param props.parent - The base branch this one syncs from, if any.
   * @param props.downstreamStrategy - How to bring `parent`'s changes in. Defaults to `"merge"`.
   * @param props.autoUpdate - Whether to sync automatically whenever `parent` changes. Defaults to `false`.
   */
  static create(props: {
    name: string;
    parent?: string;
    downstreamStrategy?: UpdateStrategy;
    autoUpdate?: boolean;
  }): BaseBranchRule {
    return new BaseBranchRule(
      props.name,
      props.parent,
      props.downstreamStrategy ?? "merge",
      props.autoUpdate ?? false,
    );
  }
}
