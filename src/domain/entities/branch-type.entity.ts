/** A short-lived topic-branch category (e.g. `feature`, `hotfix`). */
export interface BranchType {
  readonly name: string;
  readonly aliases?: readonly string[] | undefined;
  /** Base branch new topics of this type are created from. */
  readonly base: string;
  /** Base branch(es) this type is merged into on `finish`. */
  readonly target: readonly string[];
  /** Branch-name prefix, e.g. `feature/`. */
  readonly prefix: string;
  /** Explicit remote to push to; falls back to workflow-level remote config. */
  readonly pushRemote?: string | undefined;
}

/** A topic branch resolved against a concrete workflow definition. */
export interface ResolvedBranch {
  /** Full git branch name, e.g. `feature/login`. */
  readonly branch: string;
  /** Name without the type prefix, e.g. `login`. */
  readonly shortName: string;
  readonly type: BranchType;
}
