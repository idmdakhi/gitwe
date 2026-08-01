import type { BaseBranchRule } from "#gitwe/domain/valueObjects/base-branch-rule";
import type { BranchTypeRule } from "#gitwe/domain/valueObjects/branch-type-rule";

/**
 * Input for {@link InitWorkflowHandler}: define (or overwrite) the
 * workflow configuration for a repository.
 * @public
 */
export interface InitWorkflowCommand {
  readonly name: string;
  readonly baseBranches: BaseBranchRule[];
  readonly branchTypes: BranchTypeRule[];
  readonly remote?: string;
  readonly protectedBranches?: string[];
  /** Whether to create any declared base branches that don't yet exist locally. Defaults to `true`. */
  readonly createMissingBaseBranches?: boolean;
}
