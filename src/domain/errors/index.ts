/**
 * Domain error hierarchy for gitwe.
 * Every error carries a stable machine-readable `code` plus an
 * optional human-facing `hint` so the CLI layer never has to guess
 * how to explain a failure to the user.
 */
export class GitweError extends Error {
  readonly code: string;
  readonly hint?: string;

  constructor(code: string, message: string, hint?: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    if (hint !== undefined) this.hint = hint;
  }
}

export class ConfigError extends GitweError {
  constructor(message: string, hint?: string) {
    super(
      "CONFIG",
      message,
      hint ?? "Check your workflow definition file (gitwe.yaml / gitwe.json).",
    );
  }
}

export class ValidationError extends GitweError {
  constructor(message: string, hint?: string) {
    super("VALIDATION", message, hint);
  }
}

export class ConflictError extends GitweError {
  readonly files: readonly string[];

  constructor(message: string, files: readonly string[] = [], hint?: string) {
    super(
      "CONFLICT",
      message,
      hint ??
        "Resolve the conflicts, stage the files, then run `gitwe finish --continue`. To cancel, run `gitwe finish --abort`.",
    );
    this.files = files;
  }
}

export class NotInitializedError extends GitweError {
  constructor(message = "Repository is not initialised with gitwe") {
    super(
      "NOT_INITIALIZED",
      message,
      "Run `gitwe init` (or `gitwe init --preset classic`) to create a workflow definition.",
    );
  }
}

export class OperationInProgressError extends GitweError {
  constructor(operation: string) {
    super(
      "OPERATION_IN_PROGRESS",
      `A "${operation}" operation is already in progress`,
      "Use `--continue` to resume it or `--abort` to cancel it.",
    );
  }
}

export class GitCommandError extends GitweError {
  constructor(message: string, hint?: string) {
    super("GIT", message, hint);
  }
}
