/**
 * Input for {@link StartBranchHandler}: create a new topic branch.
 * @public
 */
export interface StartBranchCommand {
  /** Topic branch type declared by the active workflow, e.g. `"feature"`. */
  readonly branchType: string;
  /** Short name, e.g. `"login-page"` -> full branch `"feature/login-page"`. */
  readonly shortName: string;
  /** Overrides the branch type's configured starting point for this call only. */
  readonly from?: string;
}
