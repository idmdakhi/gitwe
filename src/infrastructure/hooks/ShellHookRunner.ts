import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { HookRunner } from "../../domain/ports/HookRunner";
import { HookPhase } from "../../domain/hooks/HookPhase";
import { HookExecutionError } from "../../domain/errors";
import type { Logger } from "../../shared/logging/Logger";
import { NoopLogger } from "../logging/NoopLogger";

const execAsync = promisify(exec);

/** Runs hook commands as real shell processes in `cwd`. */
export class ShellHookRunner implements HookRunner {
  constructor(
    private readonly cwd: string,
    private readonly logger: Logger = new NoopLogger(),
  ) {}

  async run(phase: HookPhase, commands: readonly string[]): Promise<void> {
    for (const command of commands) {
      this.logger.info(`[${phase}] Running: ${command}`);
      try {
        const { stdout, stderr } = await execAsync(command, { cwd: this.cwd, shell: "/bin/sh" });
        if (stdout) this.logger.info(stdout.trim());
        if (stderr) this.logger.warn(stderr.trim());
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new HookExecutionError(phase, command, message);
      }
    }
  }
}
