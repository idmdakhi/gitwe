// src/core/HookManager.ts
import { exec } from "node:child_process";
import { promisify } from "node:util";
const execAsync = promisify(exec);

export class HookManager {
  constructor(private readonly cwd: string) {}

  async runHooks(commands: string[], hookName: string): Promise<void> {
    for (const cmd of commands) {
      try {
        console.log(`[${hookName}] Running: ${cmd}`);
        const { stdout, stderr } = await execAsync(cmd, { cwd: this.cwd });
        if (stdout) console.log(stdout);
        if (stderr) console.warn(stderr);
      } catch (err) {
        throw new Error(`Hook "${hookName}" failed: ${(err as Error).message}`);
      }
    }
  }
}
