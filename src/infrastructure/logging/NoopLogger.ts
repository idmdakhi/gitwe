import type { Logger } from "#gitwe/shared/logging/logger";

/** Silent logger — default for library/test contexts so we never spam stdout uninvited. */
export class NoopLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}
