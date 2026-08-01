/**
 * Input for {@link DeleteBranchHandler}.
 * @public
 */
export interface DeleteBranchCommand {
  readonly branchName: string;
  /** Delete even if unmerged. Defaults to `false`. */
  readonly force?: boolean;
  /** Also delete the branch's remote-tracking counterpart, if any. Defaults to `false`. */
  readonly remote?: boolean;
}
