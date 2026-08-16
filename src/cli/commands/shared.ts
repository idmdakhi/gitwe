import type { Command } from "commander";
import { GitweError } from "../../domain/errors/index.js";
import { buildEngineDeps } from "../container.js";
import type { GlobalOptions } from "../container.js";
import { Engine } from "../../application/engine.js";
import { CommandOutput, setColorEnabled, type OutputFormat } from "../output.js";

/** Reads global flags from the root program relative to the active command. */
export function globalOptions(
  cmd: Command,
): GlobalOptions & { format: OutputFormat; dryRun: boolean } {
  const root = cmd.parent ?? cmd;
  const opts = root.opts<{
    cwd?: string;
    config?: string;
    color?: boolean;
    verbose?: boolean;
    format?: string;
    dryRun?: boolean;
  }>();

  const rawFormat = (opts.format ?? "text").toLowerCase();
  const format: OutputFormat = rawFormat === "json" || rawFormat === "yaml" ? rawFormat : "text";

  return {
    cwd: opts.cwd ?? process.cwd(),
    ...(opts.config ? { config: opts.config } : {}),
    color: opts.color ?? true,
    verbose: opts.verbose ?? false,
    format,
    dryRun: opts.dryRun === true,
  };
}

export async function loadEngine(cmd: Command): Promise<Engine> {
  return Engine.create(buildEngineDeps(globalOptions(cmd)));
}

function isConflictError(error: GitweError): error is GitweError & { files: string[] } {
  return error.code === "CONFLICT" && "files" in error;
}

/**
 * Wraps a command action so:
 * - handlers receive a {@link CommandOutput} (no per-command format branching)
 * - every {@link GitweError} becomes a clean text message or RFC-0004 envelope
 * - exit codes: 0 ok, 1 error, 2 conflict
 *
 * Must stay a regular (non-arrow) function so Commander's `this`-bound
 * Command instance is forwarded to `handler`.
 *
 * @example
 * .action(action(async function (this, out) {
 *   out.ok({ data: {...}, message: "done" });
 * }))
 *
 * // with positional args:
 * .action(action(async function (this, out, type: string, name: string) {
 *   ...
 * }))
 */
export function action<A extends unknown[]>(
  handler: (this: Command, out: CommandOutput, ...args: A) => Promise<void>,
) {
  return async function (this: Command, ...args: A): Promise<void> {
    const globals = globalOptions(this);
    setColorEnabled(globals.color);
    const out = new CommandOutput(globals.format, this.name());

    try {
      await handler.call(this, out, ...args);
    } catch (error) {
      if (error instanceof GitweError) {
        const payload = {
          code: error.code,
          message: error.message,
          ...(error.hint ? { hint: error.hint } : {}),
          ...(isConflictError(error) ? { files: error.files } : {}),
        };

        if (out.isMachine) {
          out.fail(payload);
        } else {
          console.error(`error: ${error.message}`);
          if (error.hint) console.error(`hint: ${error.hint}`);
          if (isConflictError(error)) {
            for (const f of error.files) console.error(`  - ${f}`);
          }
        }

        process.exitCode = error.code === "CONFLICT" ? 2 : 1;
        return;
      }
      throw error;
    }
  };
}
