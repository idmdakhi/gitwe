import { existsSync } from "node:fs";
import { join } from "node:path";

import { GitweError } from "../core/errors.js";
import type { Logger } from "../core/logger.js";
import { runProcess } from "../git/ProcessRunner.js";
import type { HookConfig } from "../core/types.js";

export type HookName =
  | "pre-start"
  | "post-start"
  | "pre-finish"
  | "post-finish"
  | "pre-update"
  | "post-update"
  | "pre-publish"
  | "post-publish"
  | "pre-delete"
  | "post-delete";

export interface HookContext {
  branch?: string;
  topicType?: string;
  parent?: string;
  [key: string]: string | undefined;
}

/** Runs executable scripts from the workflow's hook directory. */
export class HookRunner {
  constructor(
    private readonly root: string,
    private readonly config: HookConfig,
    private readonly logger: Logger,
  ) {}

  async run(name: HookName, context: HookContext): Promise<void> {
    if (!this.config.enabled) return;
    const script = join(this.root, this.config.path, name);
    if (!existsSync(script)) return;

    const env: NodeJS.ProcessEnv = { ...process.env };
    for (const [key, value] of Object.entries(context)) {
      if (value !== undefined) {
        env[`GITWE_${key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`] = value;
      }
    }
    this.logger.debug(`running hook ${name}`);
    const result = await runProcess(script, [], { cwd: this.root, env, inherit: true });
    if (result.exitCode !== 0) {
      throw new GitweError(
        "HOOK",
        `hook ${name} failed with exit code ${result.exitCode}`,
        "fix the hook or disable hooks in the workflow definition",
      );
    }
  }
}
