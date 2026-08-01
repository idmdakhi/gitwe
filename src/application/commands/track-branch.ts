/**
 * Input for {@link TrackBranchHandler}: create a local branch tracking an
 * existing remote branch.
 * @public
 */
export interface TrackBranchCommand {
  /** Short or full branch name to track, e.g. `"login"` or `"feature/login"`. */
  readonly branchName: string;
}
