// src/domain/errors.ts
// لایهٔ دامنه: خطاها بخشی از زبان کسب‌وکار هستند.

/**
 * کلاس پایه برای تمام خطاهای گزارش‌شده به کاربر.
 * کد خطا (code) به ما امکان می‌دهد در لایه‌های بالاتر (مثل CLI) تصمیمات خاص بگیریم.
 */
export class GitweError extends Error {
  readonly code: string;
  readonly hint?: string;

  constructor(code: string, message: string, hint?: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.hint = hint;
  }
}

export class ConfigError extends GitweError {
  constructor(message: string, hint?: string) {
    super("CONFIG", message, hint);
  }
}

export class NotInitializedError extends GitweError {
  constructor(cwd: string) {
    super(
      "NOT_INITIALIZED",
      `no gitwe workflow found for ${cwd}`,
      "run `gitwe init` to create one",
    );
  }
}

export class ValidationError extends GitweError {
  constructor(message: string, hint?: string) {
    super("VALIDATION", message, hint);
  }
}

/**
 * خطای مرتبط با اجرای مستقیم دستورات Git.
 * حاوی جزئیات خام برای دیباگ است.
 */
export class GitError extends GitweError {
  readonly args: string[];
  readonly exitCode: number;
  readonly stderr: string;

  constructor(args: string[], exitCode: number, stderr: string) {
    super("GIT", `git ${args.join(" ")} failed with exit code ${exitCode}`);
    this.args = args;
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

/**
 * خطای تعارض (Conflict) که نیاز به دخالت کاربر دارد.
 * این خطا کد خروج ۲ را در CLI ایجاد می‌کند.
 */
export class ConflictError extends GitweError {
  readonly files: string[];

  constructor(message: string, files: string[]) {
    super(
      "CONFLICT",
      message,
      "resolve the conflicts, then run the same command with --continue (or --abort to roll back)",
    );
    this.files = files;
  }
}

export class OperationStateError extends GitweError {
  constructor(message: string, hint?: string) {
    super("OPERATION_STATE", message, hint);
  }
}
