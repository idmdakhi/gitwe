import type { Logger } from "../../shared/logging/Logger";

/** Silent logger — default for library/test contexts so we never spam stdout uninvited. */
export class NoopLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

