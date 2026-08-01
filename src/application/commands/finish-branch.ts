import type { MergeStrategy } from "#gitwe/domain/valueObjects/merge-strategy";

/**
 * Input for {@link FinishBranchHandler}: merge a topic branch into its
 * configured parent, tag, delete, and propagate to auto-updating children.
 * @public
 */
export interface FinishBranchCommand {
  /** Full branch name, e.g. `"feature/login"`. */
  readonly branchName: string;
  /** Overrides the branch type's configured merge strategy for this call only. */
  readonly strategy?: MergeStrategy;
  /** Overrides the branch type's `deleteOnFinish` for this call only. */
  readonly deleteAfterMerge?: boolean;
  /** Push the parent base branch, any auto-updated children, and any tag, after finishing. Defaults to `false`. */
  readonly push?: boolean;
  /** Validate and build an execution plan without mutating the repository. Defaults to `false`. */
  readonly dryRun?: boolean;
}
