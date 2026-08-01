/**
 * A workflow's configuration for interacting with a git remote.
 *
 * An immutable value object: construct via {@link RemoteConfig.create}.
 *
 * @public
 */
export class RemoteConfig {
  private constructor(
    public readonly remote: string,
    public readonly autoPush: boolean,
  ) {}

  /**
   * @param props.remote - The remote name to use. Defaults to `"origin"`.
   * @param props.autoPush - Whether `finish` automatically pushes affected base branches and tags. Defaults to `false`.
   */
  static create(props: { remote?: string; autoPush?: boolean } = {}): RemoteConfig {
    return new RemoteConfig(props.remote ?? "origin", props.autoPush ?? false);
  }
}
