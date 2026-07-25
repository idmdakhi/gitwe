import type { UpdateStrategy } from "#gitwe/domain/valueObjects/UpdateStrategy";

export interface UpdateBranchResult {
  readonly branchName: string;
  readonly parent: string;
  readonly strategy: UpdateStrategy;
  /** Only present if strategy === "merge" */
  readonly fastForward?: boolean;
}
