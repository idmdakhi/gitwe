/**
 * Domain error hierarchy for gitwe.
 * All errors carry a stable `code` and an optional user-facing `hint`.
 */

export class GitweError extends Error {
  readonly code: string;
  readonly hint?: string;

  constructor(code: string, message: string, hint?: string) {
    super(message);
    this.name = "GitweError";
    this.code = code;
    this.hint = hint;
  }
}

export class ConfigError extends GitweError {
  constructor(message: string, hint?: string) {
    super(
      "CONFIG",
      message,
      hint ?? "Check your workflow definition file (gitwe.yaml / gitwe.json).",
    );
    this.name = "ConfigError";
  }
}

export class ValidationError extends GitweError {
  constructor(message: string, hint?: string) {
    super("VALIDATION", message, hint);
    this.name = "ValidationError";
  }
}

export class ConflictError extends GitweError {
  readonly files: string[];

  constructor(message: string, files: string[] = [], hint?: string) {
    super(
      "CONFLICT",
      message,
      hint ??
        "Resolve the conflicts, stage the files, then run `gitwe finish --continue`. To cancel, run `gitwe finish --abort`.",
    );
    this.name = "ConflictError";
    this.files = files;
  }
}

export class NotInitializedError extends GitweError {
  constructor(message = "Repository is not initialised with gitwe") {
    super(
      "NOT_INITIALIZED",
      message,
      "Run `gitwe init` (or `gitwe init --defaults`) to create a workflow definition.",
    );
    this.name = "NotInitializedError";
  }
}

export class OperationStateError extends GitweError {
  constructor(message: string, hint?: string) {
    super(
      "OPERATION_STATE",
      message,
      hint ??
        "An operation may be in progress. Use `gitwe finish --continue` or `gitwe finish --abort`, or run `gitwe doctor`.",
    );
    this.name = "OperationStateError";
  }
}

export class GitError extends GitweError {
  constructor(message: string, hint?: string) {
    super("GIT", message, hint);
    this.name = "GitError";
  }
}
