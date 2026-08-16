/** A long-lived branch of the workflow tree (e.g. `main`, `develop`). */
export interface BaseBranch {
  readonly name: string;
  readonly aliases?: readonly string[];
  /** Parent base branch this one integrates into. Absent only for the root branch. */
  readonly base?: string;
  /** When true, gitwe refuses to delete or force-push this branch. */
  readonly protected?: boolean;
}
