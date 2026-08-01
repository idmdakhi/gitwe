import type { Logger } from "#gitwe/shared/logging/logger";

/**
 * Default {@link Logger} implementation, writing to the process streams
 * (`info`/`debug` to stdout, `warn`/`error` to stderr).
 *
 * @public
 */
export class ConsoleLogger implements Logger {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(message, meta ?? "");
  }
  warn(message: string, meta?: Record<string, unknown>): void {
    console.error(`⚠ ${message}`, meta ?? "");
  }
  error(message: string, meta?: Record<string, unknown>): void {
    console.error(`✖ ${message}`, meta ?? "");
  }
  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env["GITWE_DEBUG"]) console.log(`[debug] ${message}`, meta ?? "");
  }
}
