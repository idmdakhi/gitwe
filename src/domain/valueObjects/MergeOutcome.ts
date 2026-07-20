/** The result of merging one branch into another. */
export class MergeOutcome {
  private constructor(
    public readonly source: string,
    public readonly target: string,
    public readonly fastForward: boolean,
  ) {}

  static of(source: string, target: string, fastForward: boolean): MergeOutcome {
    return new MergeOutcome(source, target, fastForward);
  }
}
