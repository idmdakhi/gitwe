import type { UpdateStrategy } from "#gitwe/domain/valueObjects/merge-strategy";

/**
 * Input for {@link UpdateBranchHandler}: sync a branch with its base.
 * @public
 */
export interface UpdateBranchCommand {
  /** Branch to update. */
  readonly branchName: string;
  /** Overrides the configured downstream/update strategy for this call only. */
  readonly strategy?: UpdateStrategy;
}
