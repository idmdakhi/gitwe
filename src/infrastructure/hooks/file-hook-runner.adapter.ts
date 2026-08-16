import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import type { HookContext, HookName, HookRunner } from "../../domain/ports/hook-runner.port.js";
import { GitweError } from "../../domain/errors/index.js";

const execFileAsync = promisify(execFile);

export class FileHookRunner implements HookRunner {
  constructor(
    private readonly root: string,
    private readonly hooksDir: string,
    private readonly enabled: boolean,
  ) {}

  async run(name: HookName, context: HookContext): Promise<void> {
    if (!this.enabled) return;
    const script = join(this.root, this.hooksDir, name);
    if (!existsSync(script)) return;

    const env = {
      ...process.env,
      ...(context.branch ? { GITWE_BRANCH: context.branch } : {}),
      ...(context.branchType ? { GITWE_TOPIC_TYPE: context.branchType } : {}),
      ...(context.base ? { GITWE_BASE: context.base } : {}),
    };

    try {
      await execFileAsync(script, [], { cwd: this.root, env });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new GitweError("HOOK_FAILED", `hook "${name}" exited with an error: ${message}`);
    }
  }
}
