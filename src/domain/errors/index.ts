export { DomainError } from "#gitwe/domain/errors/DomainError";
import { DomainError } from "#gitwe/domain/errors/DomainError";

export class BranchAlreadyExistsError extends DomainError {
  readonly code = "BRANCH_ALREADY_EXISTS";
  constructor(public readonly branchName: string) {
    super(`Branch "${branchName}" already exists.`);
  }
}

export class BranchNotFoundError extends DomainError {
  readonly code = "BRANCH_NOT_FOUND";
  constructor(public readonly branchName: string) {
    super(`Branch "${branchName}" was not found.`);
  }
}

export class UnknownBranchTypeError extends DomainError {
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

export class InvalidBranchNameError extends DomainError {
  readonly code = "INVALID_BRANCH_NAME";
  constructor(
    public readonly branchName: string,
    public readonly reason: string,
  ) {
    super(`Invalid branch name "${branchName}": ${reason}`);
  }
}

/** Thrown when a branch doesn't match any configured branch-type prefix, so its merge targets are unknown. */
export class UnrecognizedBranchError extends DomainError {
  readonly code = "UNRECOGNIZED_BRANCH";
  constructor(public readonly branchName: string) {
    super(
      `Branch "${branchName}" doesn't match any configured branch type prefix, ` +
        `so its merge targets are unknown.`,
    );
  }
}

export class InvalidWorkflowDefinitionError extends DomainError {
  readonly code = "INVALID_WORKFLOW_DEFINITION";
  constructor(message: string) {
    super(`Invalid workflow definition: ${message}`);
  }
}

/** Raised by the RuleEvaluator when one or more domain rules reject an action. */
export class WorkflowRuleViolationError extends DomainError {
  readonly code = "WORKFLOW_RULE_VIOLATION";
  constructor(
    public readonly ruleName: string,
    reason: string,
  ) {
    super(`Rule "${ruleName}" rejected this action: ${reason}`);
  }
}

export class HookExecutionError extends DomainError {
  readonly code = "HOOK_EXECUTION_FAILED";
  constructor(
    public readonly phase: string,
    public readonly command: string,
    reason: string,
  ) {
    super(`Hook "${phase}" failed running "${command}": ${reason}`);
  }
}
