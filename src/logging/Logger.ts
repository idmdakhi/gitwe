/**
 * Minimal structured-logging interface. Every layer that needs to log
 * takes a `Logger` via constructor injection instead of calling
 * `console.log` directly — this keeps core logic silent and testable,
 * and lets consumers plug in pino/winston/whatever without touching
 * engine code.
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/** Default logger for CLI usage — plain, readable console output. */
export class ConsoleLogger implements Logger {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env["GWE_DEBUG"]) this.write("DEBUG", message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.write("INFO", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write("WARN", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.write("ERROR", message, meta);
  }

  private write(level: string, message: string, meta?: Record<string, unknown>): void {
    const suffix = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    // eslint-disable-next-line no-console
    console.log(`[${level}] ${message}${suffix}`);
  }
}

/** Silent logger — used as the default in library/test contexts so we never spam stdout uninvited. */
export class NoopLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}
