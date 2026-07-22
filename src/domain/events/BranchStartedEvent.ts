import { DomainEvent } from "./DomainEvent";

export class BranchStartedEvent extends DomainEvent {
  readonly name = "branch.started";

  constructor(
    public readonly branchName: string,
    public readonly branchType: string,
    public readonly baseBranch: string,
  ) {
    super();
  }
}

