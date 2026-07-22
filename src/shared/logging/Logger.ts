/**
 * Minimal structured-logging port. Every layer that needs to log takes a
 * `Logger` via constructor injection instead of calling `console.log`
 * directly — this keeps domain/application logic silent and testable, and
 * lets consumers plug in pino/winston/whatever without touching engine code.
 *
 * Lives in `shared/` (not `domain/`) because logging is a cross-cutting
 * concern used by every layer, not a domain concept.
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

