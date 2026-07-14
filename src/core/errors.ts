/**
 * Base class for every error this library throws. Carries a stable
 * `code` so callers (CLI, other tools) can branch on error type
 * without doing fragile `instanceof` chains across module boundaries
 * (e.g. if this package is bundled twice).
 */
export abstract class GitflowError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class GitCommandError extends GitflowError {
  readonly code = "GIT_COMMAND_FAILED";

  constructor(
    message: string,
    public readonly command: string,
    public readonly stderr: string,
  ) {
    super(message);
  }
}

export class BranchAlreadyExistsError extends GitflowError {
  readonly code = "BRANCH_ALREADY_EXISTS";

  constructor(public readonly branchName: string) {
    super(`Branch "${branchName}" already exists.`);
  }
}

export class BranchNotFoundError extends GitflowError {
  readonly code = "BRANCH_NOT_FOUND";

  constructor(public readonly branchName: string) {
    super(`Branch "${branchName}" was not found.`);
  }
}

export class UnknownBranchTypeError extends GitflowError {
  readonly code = "UNKNOWN_BRANCH_TYPE";

  constructor(
    public readonly branchType: string,
    public readonly known: string[],
  ) {
    super(
      `Unknown branch type "${branchType}". Known types: ${known.join(", ") || "(none defined)"}`,
    );
  }
}

export class InvalidBranchNameError extends GitflowError {
  readonly code = "INVALID_BRANCH_NAME";

  constructor(
    public readonly branchName: string,
    public readonly reason: string,
  ) {
    super(`Invalid branch name "${branchName}": ${reason}`);
  }
}

/**
 * Thrown by `finish()` when the branch being finished doesn't match
 * any configured branch-type prefix, so the engine can't know its
 * merge targets.
 */
export class UnrecognizedBranchError extends GitflowError {
  readonly code = "UNRECOGNIZED_BRANCH";

  constructor(public readonly branchName: string) {
    super(
      `Branch "${branchName}" doesn't match any configured branch type prefix, ` +
        `so its merge targets are unknown.`,
    );
  }
}

export class InvalidWorkflowDefinitionError extends GitflowError {
  readonly code = "INVALID_WORKFLOW_DEFINITION";

  constructor(message: string) {
    super(`Invalid workflow definition: ${message}`);
  }
}
