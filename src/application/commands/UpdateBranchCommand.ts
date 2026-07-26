import type { UpdateStrategy } from "#gitwe/domain/valueObjects/UpdateStrategy";

export interface UpdateBranchCommand {
  readonly branchName: string;
  /** Override the branch type's default downstream strategy. */
  readonly strategy?: UpdateStrategy;
}
