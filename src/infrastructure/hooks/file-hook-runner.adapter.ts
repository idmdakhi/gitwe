import { execFile, exec } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import type { HookContext, HookName, HookRunner } from "../../domain/ports/hook-runner.port.js";
import type { HookConfig, HookDefinition } from "../../domain/entities/hook-config.entity.js";
import { GitweError } from "../../domain/errors/index.js";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

export interface HookRunnerOptions {
  root: string;
  config: HookConfig;
  verbose?: boolean;
}

export class FileHookRunner implements HookRunner {
  constructor(
    private readonly root: string,
    private readonly config: HookConfig,
    private readonly verbose: boolean = false,
  ) {}

  async run(name: HookName, context: HookContext): Promise<void> {
    if (!this.config.enabled) return;

    const type = context.branchType;
    const definition = this.getDefinition(name, type);
    if (!definition) return;

    const script = this.resolveScript(definition, name);
    if (!script) return;

    const env = this.buildEnv(context);
    const stdin = this.buildStdin(context, definition.stdin);

    try {
      if (this.verbose) {
        console.error(`[gitwe] Running hook: ${name} (${script})`);
      }

      if (definition.stdin) {
        // اجرا با JSON در STDIN
        await this.runWithStdin(script, stdin, env, definition.continueOnError);
      } else {
        // اجرای معمولی با متغیرهای محیطی
        if (script.startsWith("echo ") || script.startsWith("npm ") || script.startsWith("node ")) {
          // دستور inline
          await this.runInline(script, env, definition.continueOnError);
        } else {
          // فایل اسکریپت
          await this.runScript(script, env, definition.continueOnError);
        }
      }
    } catch (error) {
      if (definition.continueOnError) {
        console.warn(`[gitwe] Hook ${name} failed but continueOnError is true:`, error);
        return;
      }
      throw error;
    }
  }

  private getDefinition(name: HookName, type?: string): HookDefinition | null {
    // ۱. اولویت با typeOverrides (اگر نوع شاخه مشخص باشد)
    if (type && this.config.typeOverrides?.[type]) {
      const typeHook = this.config.typeOverrides[type]?.[name];
      if (typeHook) {
        return typeof typeHook === "string" ? { script: typeHook } : typeHook;
      }
    }

    // ۲. سپس advanced hooks
    const advanced = this.config.advanced?.[name];
    if (advanced) return advanced;

    // ۳. سپس inline hooks
    const inline = this.config.inline?.[name];
    if (inline) return { script: inline };

    // ۴. در نهایت فایل اسکریپت در مسیر پیش‌فرض
    const scriptPath = join(this.root, this.config.path, name);
    if (existsSync(scriptPath)) {
      return { script: scriptPath };
    }

    return null;
  }

  private resolveScript(definition: HookDefinition, name: HookName): string | null {
    if (definition.script) return definition.script;

    // fallback به مسیر پیش‌فرض
    const scriptPath = join(this.root, this.config.path, name);
    return existsSync(scriptPath) ? scriptPath : null;
  }

  private buildEnv(context: HookContext): NodeJS.ProcessEnv {
    const env: Record<string, string> = {};
    if (context.branch) env.GITWE_BRANCH = context.branch;
    if (context.branchType) env.GITWE_TYPE = context.branchType;
    if (context.base) env.GITWE_BASE = context.base;
    if (context.target)
      env.GITWE_TARGET = Array.isArray(context.target) ? context.target.join(",") : context.target;
    if (context.dryRun !== undefined) env.GITWE_DRY_RUN = String(context.dryRun);
    if (context.force !== undefined) env.GITWE_FORCE = String(context.force);
    if (context.tagName) env.GITWE_TAG_NAME = context.tagName;
    if (context.oldName) env.GITWE_OLD_NAME = context.oldName;
    if (context.newName) env.GITWE_NEW_NAME = context.newName;
    if (context.remote) env.GITWE_REMOTE = context.remote;
    return { ...process.env, ...env };
  }

  private buildStdin(context: HookContext, enable: boolean = false): string | undefined {
    if (!enable) return undefined;
    return JSON.stringify({
      operation: context.operation,
      branch: context.branch,
      type: context.branchType,
      base: context.base,
      target: context.target,
      dryRun: context.dryRun,
      force: context.force,
      tagName: context.tagName,
      remote: context.remote,
      extra: context.extra || {},
    });
  }

  private async runScript(
    script: string,
    env: NodeJS.ProcessEnv,
    continueOnError?: boolean,
  ): Promise<void> {
    try {
      const { stdout, stderr } = await execFileAsync(script, [], {
        cwd: this.root,
        env,
        shell: true,
      });
      if (this.verbose) {
        if (stdout) console.error(stdout);
        if (stderr) console.error(stderr);
      }
    } catch (error: any) {
      const code = error.code ?? 1;
      if (code === 2 && continueOnError) {
        // کد ۲ = Warning, ادامه بده
        console.warn(`[gitwe] Hook warning (exit code 2): ${error.message}`);
        return;
      }
      if (code !== 0 && !continueOnError) {
        throw new GitweError(
          "HOOK_FAILED",
          `Hook "${script}" exited with code ${code}: ${error.message}`,
        );
      }
    }
  }

  private async runInline(
    command: string,
    env: NodeJS.ProcessEnv,
    continueOnError?: boolean,
  ): Promise<void> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.root,
        env,
        shell: true,
      });
      if (this.verbose) {
        if (stdout) console.error(stdout);
        if (stderr) console.error(stderr);
      }
    } catch (error: any) {
      const code = error.code ?? 1;
      if (code === 2 && continueOnError) {
        console.warn(`[gitwe] Hook warning (exit code 2): ${error.message}`);
        return;
      }
      if (code !== 0 && !continueOnError) {
        throw new GitweError("HOOK_FAILED", `Hook command failed: ${error.message}`);
      }
    }
  }

  private async runWithStdin(
    script: string,
    stdin: string | undefined,
    env: NodeJS.ProcessEnv,
    continueOnError?: boolean,
  ): Promise<void> {
    // اجرای اسکریپت با ارسال JSON به STDIN
    const child = execFileAsync(script, [], {
      cwd: this.root,
      env,
      shell: true,
      input: stdin,
    });
    try {
      const { stdout, stderr } = await child;
      if (this.verbose) {
        if (stdout) console.error(stdout);
        if (stderr) console.error(stderr);
      }
      // بررسی خروجی JSON (اختیاری)
      if (stdout) {
        try {
          const result = JSON.parse(stdout);
          if (result.continue === false) {
            throw new GitweError(
              "HOOK_BLOCKED",
              `Hook "${script}" blocked the operation: ${result.message || "no reason given"}`,
            );
          }
          if (result.message && this.verbose) {
            console.error(`[gitwe] Hook message: ${result.message}`);
          }
        } catch (parseError) {
          // اگر خروجی JSON نبود، نادیده بگیر
          if (this.verbose) {
            console.error(`[gitwe] Hook stdout (not JSON): ${stdout}`);
          }
        }
      }
    } catch (error: any) {
      const code = error.code ?? 1;
      if (code === 2 && continueOnError) {
        console.warn(`[gitwe] Hook warning (exit code 2): ${error.message}`);
        return;
      }
      if (code !== 0 && !continueOnError) {
        throw new GitweError("HOOK_FAILED", `Hook "${script}" failed: ${error.message}`);
      }
    }
  }
}
