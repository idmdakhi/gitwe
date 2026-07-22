export class RemoteConfig {
  private constructor(
    public readonly remote: string,
    public readonly autoPush: boolean,
    public readonly autoPull: boolean,
  ) {}

  static create(props: { remote?: string; autoPush?: boolean; autoPull?: boolean } = {}): RemoteConfig {
    return new RemoteConfig(props.remote ?? "origin", props.autoPush ?? false, props.autoPull ?? false);
  }
}

