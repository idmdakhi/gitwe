import type { Command } from "commander";
import { GitweError } from "../../domain/errors/index.js";
import { buildEngineDeps } from "../container.js";
import type { GlobalOptions } from "../container.js";
import { Engine } from "../../application/engine.js";

/** Reads global flags off the root program, resolved relative to the running command. */
export function globalOptions(cmd: Command): GlobalOptions {
  const root = cmd.parent ?? cmd;
  const opts = root.opts<{ cwd?: string; config?: string; color?: boolean; verbose?: boolean }>();
  return {
    cwd: opts.cwd ?? process.cwd(),
    ...(opts.config ? { config: opts.config } : {}),
    color: opts.color ?? true,
    verbose: opts.verbose ?? false,
  };
}

export async function loadEngine(cmd: Command): Promise<Engine> {
  return Engine.create(buildEngineDeps(globalOptions(cmd)));
}

/**
 * Wraps a command action so every {@link GitweError} prints a clean,
 * exit-coded message. Must stay a regular (non-arrow) function so
 * Commander's `this`-bound Command instance is forwarded to `handler`.
 */
export function action<A extends unknown[]>(handler: (this: Command, ...args: A) => Promise<void>) {
  return async function (this: Command, ...args: A): Promise<void> {
    try {
      await handler.apply(this, args);
    } catch (error) {
      if (error instanceof GitweError) {
        console.error(`error: ${error.message}`);
        if (error.hint) console.error(`hint: ${error.hint}`);
        process.exitCode = error.code === "CONFLICT" ? 2 : 1;
        return;
      }
      throw error;
    }
  };
}
