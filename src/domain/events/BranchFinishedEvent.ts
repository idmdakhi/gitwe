import { DomainEvent } from "#gitwe/domain/events/DomainEvent";

export class BranchFinishedEvent extends DomainEvent {
  readonly name = "branch.finished";

  constructor(
    public readonly branchName: string,
    public readonly mergedInto: readonly string[],
    public readonly tags: readonly string[],
    public readonly deleted: boolean,
  ) {
    super();
  }
}
