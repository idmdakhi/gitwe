import { DomainEvent } from "#gitwe/domain/events/domain-event";

/** Published after a new branch has been created and checked out. @public */
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

/** Published after a branch has completed `finish`: merged, optionally tagged, optionally deleted. @public */
export class BranchFinishedEvent extends DomainEvent {
  readonly name = "branch.finished";
  constructor(
    public readonly branchName: string,
    public readonly mergedInto: string,
    public readonly tag: string | undefined,
    public readonly deleted: boolean,
  ) {
    super();
  }
}

/** Published after a branch has been pushed to a remote via `publish`. @public */
export class BranchPublishedEvent extends DomainEvent {
  readonly name = "branch.published";
  constructor(
    public readonly branchName: string,
    public readonly remote: string,
  ) {
    super();
  }
}
