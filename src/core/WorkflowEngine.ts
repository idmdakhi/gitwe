import type { GitAdapter } from "../adapters/GitAdapter";
import type { WorkflowDefinition, BranchTypeRule, HookDefinition } from "./WorkflowDefinition";
import { validateWorkflowDefinition } from "./WorkflowDefinition";
import type { Logger } from "../logging/Logger";
import { NoopLogger } from "../logging/Logger";
import type { Branch, MergeResult } from "./types";
import {
  UnknownBranchTypeError,
  InvalidBranchNameError,
  BranchNotFoundError,
  UnrecognizedBranchError,
} from "./errors";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// تابع کمکی برای اجرای دستورات با shell (نوع‌ایمن)
function execShell(cmd: string, cwd: string): Promise<{ stdout: string; stderr: string }> {
  // تشخیص shell مناسب برای سیستم‌عامل
  const isWin = process.platform === "win32";
  const shell = isWin ? process.env.ComSpec || "cmd.exe" : "/bin/sh";

  return execAsync(cmd, {
    cwd,
    shell, // از نوع string است
    encoding: "utf-8",
  });
}

export interface StartOptions {
  push?: boolean;
  remote?: string;
  skipHooks?: boolean;
}

export interface FinishOptions {
  deleteAfterMerge?: boolean;
  push?: boolean;
  remote?: string;
  tag?: boolean;
  tagPrefix?: string;
  skipHooks?: boolean;
}

export interface FinishResult {
  branch: string;
  merges: MergeResult[];
  deleted: boolean;
  tag?: string;
}

/**
 * HookManager executes custom scripts before/after operations.
 */
class HookManager {
  constructor(
    private readonly cwd: string,
    private readonly logger: Logger,
  ) {}

  async runHooks(
    hooks: HookDefinition | undefined,
    hookType: keyof HookDefinition,
    skip: boolean = false,
  ): Promise<void> {
    if (skip) return;

    const commands = hooks?.[hookType];
    if (!commands || commands.length === 0) return;

    this.logger.info(`Running ${hookType} hooks`, { count: commands.length });

    for (const cmd of commands) {
      try {
        this.logger.debug(`Executing hook: ${cmd}`);
        const { stdout, stderr } = await execShell(cmd, this.cwd);
        if (stdout) this.logger.info(stdout.trim());
        if (stderr) this.logger.warn(stderr.trim());
      } catch (err) {
        const error = err as Error;
        this.logger.error(`Hook "${hookType}" failed`, { command: cmd, error: error.message });
        throw new Error(`Hook "${hookType}" failed: ${error.message}`);
      }
    }

    this.logger.info(`Completed ${hookType} hooks`);
  }
}

export class WorkflowEngine {
  private hookManager: HookManager;

  constructor(
    private readonly git: GitAdapter,
    private readonly definition: WorkflowDefinition,
    private readonly logger: Logger = new NoopLogger(),
    private readonly cwd: string = process.cwd(),
  ) {
    validateWorkflowDefinition(definition);
    this.hookManager = new HookManager(this.cwd, this.logger);
  }

  async currentBranch(): Promise<string> {
    return this.git.getCurrentBranch();
  }

  async listBranches(): Promise<Branch[]> {
    return this.git.listBranches();
  }

  listBranchTypes(): string[] {
    return this.definition.branchTypes.map((r) => r.name);
  }

  async start(branchType: string, shortName: string, options: StartOptions = {}): Promise<string> {
    await this.hookManager.runHooks(this.definition.hooks, "preStart", options.skipHooks);

    const rule = this.findRuleByTypeName(branchType);
    this.validateShortName(shortName);

    const fullName = `${rule.prefix}${shortName}`;

    if (!(await this.git.branchExists(rule.baseBranch))) {
      throw new BranchNotFoundError(rule.baseBranch);
    }

    if (this.definition.remote?.autoPull) {
      await this.git.pull?.(this.definition.remote.remote, rule.baseBranch);
    }

    await this.git.createBranch(fullName, { from: rule.baseBranch, checkout: true });
    this.logger.info("started branch", { type: branchType, branch: fullName });

    const shouldPush = options.push ?? this.definition.remote?.autoPush ?? false;
    if (shouldPush) {
      const remote = options.remote ?? this.definition.remote?.remote ?? "origin";
      await this.git.push?.(remote, fullName);
    }

    await this.hookManager.runHooks(this.definition.hooks, "postStart", options.skipHooks);

    return fullName;
  }

  async finish(fullBranchName: string, options: FinishOptions = {}): Promise<FinishResult> {
    await this.hookManager.runHooks(this.definition.hooks, "preFinish", options.skipHooks);

    const rule = this.findRuleByBranchName(fullBranchName);

    if (!(await this.git.branchExists(fullBranchName))) {
      throw new BranchNotFoundError(fullBranchName);
    }

    if (this.definition.remote?.autoPull) {
      const remote = this.definition.remote.remote ?? "origin";
      for (const target of rule.mergeTargets) {
        await this.git.pull?.(remote, target);
      }
    }

    const merges: MergeResult[] = [];
    for (const target of rule.mergeTargets) {
      if (!(await this.git.branchExists(target))) {
        throw new BranchNotFoundError(target);
      }
      const result = await this.git.merge(fullBranchName, target);
      merges.push(result);
      this.logger.info("merged branch", { source: fullBranchName, target });
    }

    let tagName: string | undefined;
    const shouldTag = options.tag ?? rule.autoTag !== undefined;
    if (shouldTag && rule.name === "release") {
      const prefix = options.tagPrefix ?? rule.autoTag?.prefix ?? "v";
      const versionPart = fullBranchName.replace(rule.prefix, "");
      tagName = `${prefix}${versionPart}`;
      await this.git.createTag?.(tagName, `Release ${versionPart}`);
      this.logger.info("tag created", { tag: tagName });
    }

    const shouldDelete = options.deleteAfterMerge ?? rule.deleteOnFinish ?? true;
    if (shouldDelete) {
      await this.git.deleteBranch(fullBranchName);
      this.logger.info("deleted finished branch", { branch: fullBranchName });
    }

    const shouldPush = options.push ?? this.definition.remote?.autoPush ?? false;
    if (shouldPush) {
      const remote = options.remote ?? this.definition.remote?.remote ?? "origin";
      const targets = new Set(merges.map((m) => m.target));
      for (const target of targets) {
        await this.git.push?.(remote, target);
      }
      if (tagName) {
        await this.git.push?.(remote, tagName);
      }
      if (shouldDelete) {
        await this.git.push?.(remote, `--delete ${fullBranchName}`);
      }
    }

    await this.hookManager.runHooks(this.definition.hooks, "postFinish", options.skipHooks);

    return {
      branch: fullBranchName,
      merges,
      deleted: shouldDelete,
      ...(tagName ? { tag: tagName } : {}),
    };
  }

  private findRuleByTypeName(branchType: string): BranchTypeRule {
    const rule = this.definition.branchTypes.find((r) => r.name === branchType);
    if (!rule) {
      throw new UnknownBranchTypeError(branchType, this.listBranchTypes());
    }
    return rule;
  }

  private findRuleByBranchName(fullBranchName: string): BranchTypeRule {
    const rule = this.definition.branchTypes.find((r) => fullBranchName.startsWith(r.prefix));
    if (!rule) {
      throw new UnrecognizedBranchError(fullBranchName);
    }
    return rule;
  }

  private validateShortName(shortName: string): void {
    if (shortName.trim() === "") {
      throw new InvalidBranchNameError(shortName, "cannot be empty");
    }
    if (/\s/.test(shortName)) {
      throw new InvalidBranchNameError(shortName, "cannot contain whitespace");
    }
    if (shortName.includes("..")) {
      throw new InvalidBranchNameError(shortName, 'cannot contain ".."');
    }
  }
}
