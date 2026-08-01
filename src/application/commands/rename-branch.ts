/**
 * Input for {@link RenameBranchHandler}.
 * @public
 */
export interface RenameBranchCommand {
  readonly oldName: string;
  readonly newName: string;
}
