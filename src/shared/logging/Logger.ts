/**
 * Minimal structured logging port used across the CLI and application
 * layer. Kept intentionally small so any logger (console, pino, a test
 * spy) can implement it.
 *
 * @public
 */
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}
