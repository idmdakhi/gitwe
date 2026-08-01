import { DomainError } from "#gitwe/domain/errors/domain-error";
export { DomainError };

/** A branch the caller tried to create already exists. @public */
export class BranchAlreadyExistsError extends DomainError {
  readonly code = "BRANCH_ALREADY_EXISTS";
  constructor(public readonly branchName: string) {
    super(`Branch "${branchName}" already exists.`);
  }
}

/** A branch referenced by an operation does not exist locally. @public */
export class BranchNotFoundError extends DomainError {
  readonly code = "BRANCH_NOT_FOUND";
  constructor(public readonly branchName: string) {
    super(`Branch "${branchName}" was not found.`);
  }
}

/** A branch type name is not declared in the active {@link Workflow}. @public */
export class UnknownBranchTypeError extends DomainError {
  readonly code = "UNKNOWN_BRANCH_TYPE";
  constructor(
    public readonly branchType: string,
    public readonly known: string[],
  ) {
    super(`Unknown branch type "${branchType}". Known types: ${known.join(", ") || "(none defined)"}`);
  }
}

/** A raw branch-name string fails structural validation. @public */
export class InvalidBranchNameError extends DomainError {
  readonly code = "INVALID_BRANCH_NAME";
  constructor(
    public readonly branchName: string,
    public readonly reason: string,
  ) {
    super(`Invalid branch name "${branchName}": ${reason}`);
  }
}

/** A branch doesn't match any configured topic-branch prefix. @public */
export class UnrecognizedBranchError extends DomainError {
  readonly code = "UNRECOGNIZED_BRANCH";
  constructor(public readonly branchName: string) {
    super(`Branch "${branchName}" doesn't match any configured branch type prefix.`);
  }
}

/** A base branch name referenced by config (e.g. a topic type's `parent`) is not declared. @public */
export class UnknownBaseBranchError extends DomainError {
  readonly code = "UNKNOWN_BASE_BRANCH";
  constructor(public readonly baseBranchName: string) {
    super(`Unknown base branch "${baseBranchName}". Declare it with "gitwe config add-base" first.`);
  }
}

/** A workflow definition violates one of its structural invariants. @public */
export class InvalidWorkflowDefinitionError extends DomainError {
  readonly code = "INVALID_WORKFLOW_DEFINITION";
  constructor(message: string) {
    super(`Invalid workflow definition: ${message}`);
  }
}

/** A domain {@link Rule} rejected an action. @public */
export class WorkflowRuleViolationError extends DomainError {
  readonly code = "WORKFLOW_RULE_VIOLATION";
  constructor(
    public readonly ruleName: string,
    reason: string,
  ) {
    super(reason);
  }
}

/** An action targeted a branch listed in a workflow's `protectedBranches`. @public */
export class ProtectedBranchError extends DomainError {
  readonly code = "PROTECTED_BRANCH";
  constructor(
    public readonly branchName: string,
    public readonly action: string,
  ) {
    super(`Branch "${branchName}" is protected and cannot be ${action}.`);
  }
}

/** `track` or `checkout` referenced a branch with no matching remote-tracking branch. @public */
export class RemoteBranchNotFoundError extends DomainError {
  readonly code = "REMOTE_BRANCH_NOT_FOUND";
  constructor(
    public readonly branchName: string,
    public readonly remote: string,
  ) {
    super(`No branch "${branchName}" found on remote "${remote}".`);
  }
}

/** A partial-name `checkout` matched more than one branch. @public */
export class AmbiguousBranchMatchError extends DomainError {
  readonly code = "AMBIGUOUS_BRANCH_MATCH";
  constructor(
    public readonly query: string,
    public readonly matches: readonly string[],
  ) {
    super(`"${query}" matches multiple branches: ${matches.join(", ")}. Be more specific.`);
  }
}

/** `finish`/`publish` refused to proceed because the local branch has diverged from its remote-tracking branch. @public */
export class RemoteOutOfSyncError extends DomainError {
  readonly code = "REMOTE_OUT_OF_SYNC";
  constructor(
    public readonly branchName: string,
    public readonly ahead: number,
    public readonly behind: number,
  ) {
    super(
      `Branch "${branchName}" has diverged from its remote (${ahead} ahead, ${behind} behind). ` +
        `Pull or push to reconcile before continuing.`,
    );
  }
}
