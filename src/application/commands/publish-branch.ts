/**
 * Input for {@link PublishBranchHandler}: push a local branch and set it
 * up to track the resulting remote branch.
 * @public
 */
export interface PublishBranchCommand {
  readonly branchName: string;
}
