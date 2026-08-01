/**
 * A branch as it currently exists in the repository.
 *
 * An entity (identified by `name`), not a value object — two `Branch`
 * instances with the same `name` represent the same real branch even if
 * other fields differ over time.
 *
 * @public
 */
export class Branch {
  /**
   * @param name - Full branch name, e.g. `"feature/login"`.
   * @param isCurrent - Whether this is the currently checked-out branch.
   * @param isRemote - Whether this is a remote-tracking ref (e.g. `origin/main`) rather than a local branch.
   * @param upstream - The remote-tracking branch this local branch is linked to (e.g. `"origin/feature/login"`), if any.
   */
  constructor(
    public readonly name: string,
    public readonly isCurrent: boolean,
    public readonly isRemote: boolean,
    public readonly upstream?: string,
  ) {}
}
