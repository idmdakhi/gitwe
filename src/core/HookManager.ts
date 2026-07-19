import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { HookDefinition } from "./WorkflowDefinition";
import type { Logger } from "../logging/Logger";
import { NoopLogger } from "../logging/Logger";

const execAsync = promisify(exec);

export class HookManager {
  constructor(
    private readonly cwd: string,
    private readonly hooks?: HookDefinition,
    private readonly logger: Logger = new NoopLogger(),
  ) {}

  async runHooks(hookName: keyof HookDefinition): Promise<void> {
    const commands = this.hooks?.[hookName];
    if (!commands || commands.length === 0) return;

    for (const cmd of commands) {
      this.logger.info(`[${hookName}] Running: ${cmd}`);
      try {
        const { stdout, stderr } = await execAsync(cmd, { cwd: this.cwd, shell: true });
        if (stdout) this.logger.info(stdout);
        if (stderr) this.logger.warn(stderr);
      } catch (error: any) {
        this.logger.error(`Hook "${hookName}" failed: ${error.message}`);
        throw new Error(`Hook "${hookName}" failed: ${error.message}`);
      }
    }
  }
}
