// src/application/workflows/finish-workflow.ts

import type {
  Workflow,
  WorkflowStep,
  WorkflowContext,
  OperationState,
} from "../interfaces/index.js";
import type { ResolvedBranch, BaseBranch } from "../../domain/entities.js";
import type { FinishOptions, FinishResult } from "../use-case/finish.js";
import { ConflictError, ValidationError } from "../../domain/errors.js";
import { expandMessage, type EngineContext } from "../context.js";
import { style } from "../../cli/output.js";
import { dirname, resolve } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import yaml from "js-yaml";
import { createInterface } from "node:readline/promises";
import { strict } from "node:assert";

interface VersionBumpData {
  current: string;
  new: string;
  type: string;
  tagName?: string;
  message: string;
  shouldTag: boolean;
  committed?: boolean;
  tagCreated?: boolean;
}
// ============================================================================
//  پیاده‌سازی WorkflowContext برای موتور
// ============================================================================

export class EngineWorkflowContext implements WorkflowContext {
  readonly operation: string;
  private _state: OperationState;
  private readonly store: EngineContext["state"];
  private readonly logger: EngineContext["logger"];

  constructor(
    private readonly ctx: EngineContext,
    operation: string,
    initialState: OperationState,
  ) {
    this.operation = operation;
    this._state = initialState;
    this.store = ctx.state;
    this.logger = ctx.logger;
  }

  get state(): OperationState {
    return this._state;
  }

  async saveState(): Promise<void> {
    await this.store.write(this._state);
    this.logger.debug(`state saved (step: ${this._state.currentStep})`);
  }

  async clearState(): Promise<void> {
    await this.store.clear();
    this.logger.debug("state cleared");
  }

  // دسترسی به context اصلی برای Stepها
  get engineContext(): EngineContext {
    return this.ctx;
  }
}

// ============================================================================
//  Stepهای مختلف عملیات finish
// ============================================================================

/**
 * گام اولیه: بررسی وجود شاخه، وضعیت پاک و ذخیرهٔ snapshot
 */
class PreflightStep implements WorkflowStep<EngineWorkflowContext> {
  readonly id = "preflight";
  readonly title = "Preflight checks";

  async canExecute(context: EngineWorkflowContext): Promise<boolean> {
    return true;
  }

  async execute(context: EngineWorkflowContext): Promise<void> {
    const { git, workflow, logger } = context.engineContext;
    const branch = context.state.data.branch as string;
    const targets = context.state.data.targets as string[];

    if (!(await git.branchExists(branch))) {
      throw new ValidationError(`branch "${branch}" does not exist`);
    }

    if (targets.length > 0) {
      for (const target of targets) {
        if (!(await git.branchExists(target))) {
          throw new ValidationError(`base branch "${target}" does not exist`);
        }
      }
    } else {
      logger.warn(`branch type has no target; no merge will be performed`);
    }

    if (!(await git.isClean())) {
      throw new ValidationError(
        "the working tree has uncommitted changes",
        "commit or stash them before finishing",
      );
    }

    // ذخیرهٔ شاخهٔ فعلی و snapshot از targetها
    const current = await git.currentBranch();
    context.state.data.originalBranch = current ?? targets[0];

    const snapshots = (context.state.data.snapshots as Record<string, string>) || {};
    for (const target of targets) {
      if (!(await git.branchExists(target))) continue;
      snapshots[target] = await git.revParse(target);
    }
    context.state.data.snapshots = snapshots;

    // اجرای hook pre-finish
    await context.engineContext.hooks.run("pre-finish", {
      branch,
      branchType: context.state.data.branchType as string,
      parent: targets.join(","),
    });
  }

  async resume(_context: EngineWorkflowContext): Promise<void> {
    // این مرحله قابل ادامه نیست
  }

  async rollback(_context: EngineWorkflowContext): Promise<void> {
    // هیچ تغییری برای بازگردانی ندارد
  }

  async isCompleted(context: EngineWorkflowContext): Promise<boolean> {
    // فرض می‌کنیم اگر snapshotها ذخیره شده‌اند، کامل است
    const snapshots = context.state.data.snapshots as Record<string, string> | undefined;
    return snapshots !== undefined && Object.keys(snapshots).length > 0;
  }
}

/**
 * Fetch از remote
 */
class FetchStep implements WorkflowStep<EngineWorkflowContext> {
  readonly id = "fetch";
  readonly title = "Fetch from remote";

  async canExecute(context: EngineWorkflowContext): Promise<boolean> {
    const options = context.state.data.options as FinishOptions;
    if (options.fetch === false) return false;
    const remote = context.engineContext.workflow.remoteName;
    return await context.engineContext.git.remoteExists(remote);
  }

  async execute(context: EngineWorkflowContext): Promise<void> {
    const remote = context.engineContext.workflow.remoteName;
    await context.engineContext.git.fetch(remote);
  }

  async resume(_context: EngineWorkflowContext): Promise<void> {}
  async rollback(_context: EngineWorkflowContext): Promise<void> {}

  async isCompleted(context: EngineWorkflowContext): Promise<boolean> {
    // همیشه بعد از اجرا کامل در نظر گرفته می‌شود
    return true;
  }
}

/**
 * بررسی sync با remote
 */
class RemoteSyncCheckStep implements WorkflowStep<EngineWorkflowContext> {
  readonly id = "remote-sync-check";
  readonly title = "Check remote sync";

  async canExecute(context: EngineWorkflowContext): Promise<boolean> {
    const options = context.state.data.options as FinishOptions;
    if (options.force === true) return false;
    const remote = context.engineContext.workflow.remoteName;
    const branch = context.state.data.branch as string;
    return (
      (await context.engineContext.git.remoteExists(remote)) &&
      (await context.engineContext.git.remoteBranchExists(remote, branch))
    );
  }

  async execute(context: EngineWorkflowContext): Promise<void> {
    const { git, workflow } = context.engineContext;
    const remote = workflow.remoteName;
    const branch = context.state.data.branch as string;
    const { behind } = await git.aheadBehind(branch, `${remote}/${branch}`);
    if (behind > 0) {
      throw new ValidationError(
        `"${branch}" is ${behind} commit(s) behind ${remote}/${branch}`,
        "pull the remote changes first, or pass --force",
      );
    }
  }

  async resume(_context: EngineWorkflowContext): Promise<void> {}
  async rollback(_context: EngineWorkflowContext): Promise<void> {}
  async isCompleted(_context: EngineWorkflowContext): Promise<boolean> {
    return true;
  }
}

/**
 * Rebase (در صورت نیاز)
 */
class RebaseBranchStep implements WorkflowStep<EngineWorkflowContext> {
  readonly id = "rebase-branch";
  readonly title = "Rebase topic onto parent";

  async canExecute(context: EngineWorkflowContext): Promise<boolean> {
    const options = context.state.data.options as FinishOptions;
    const strategy = options.rebase
      ? "rebase"
      : context.engineContext.workflow.mergeStrategyFor(
          context.engineContext.workflow.requireBranchType(context.state.data.branchType as string),
        );
    if (strategy !== "rebase") return false;
    const targets = context.state.data.targets as string[];
    if (targets.length === 0) return false;
    const base = targets[0];
    const branch = context.state.data.branch as string;
    return !(await context.engineContext.git.isAncestor(base, branch));
  }

  async execute(context: EngineWorkflowContext): Promise<void> {
    const { git } = context.engineContext;
    const branch = context.state.data.branch as string;
    const base = (context.state.data.targets as string[])[0];
    await git.checkout(branch);
    await git.rebase(base);
  }

  async resume(_context: EngineWorkflowContext): Promise<void> {}
  async rollback(_context: EngineWorkflowContext): Promise<void> {}
  async isCompleted(_context: EngineWorkflowContext): Promise<boolean> {
    return true;
  }
}

/**
 * ادغام در شاخهٔ پایه (merge یا squash)
 */
class MergeIntoBaseStep implements WorkflowStep<EngineWorkflowContext> {
  readonly id = "merge-into-base";
  readonly title = "Merge into base branch";

  async canExecute(context: EngineWorkflowContext): Promise<boolean> {
    const { git } = context.engineContext;
    // اگر merge یا rebase در حال انجام است، نیازی به اجرا نداریم (resume انجام می‌دهد)
    if ((await git.mergeInProgress()) || (await git.rebaseInProgress())) {
      return false;
    }
    const targets = context.state.data.targets as string[];
    if (targets.length === 0) return false;
    const branch = context.state.data.branch as string;
    const base = targets[0];
    return !(await context.engineContext.git.isAncestor(branch, base));
  }

  async execute(context: EngineWorkflowContext): Promise<void> {
    const { git, logger } = context.engineContext;
    const branch = context.state.data.branch as string;
    const targets = context.state.data.targets as string[];
    const base = targets[0];
    const options = context.state.data.options as FinishOptions;
    const strategy = context.state.data.strategy as string;

    const snapshots = (context.state.data.snapshots as Record<string, string>) || {};
    if (!snapshots[base]) {
      snapshots[base] = await git.revParse(base);
      context.state.data.snapshots = snapshots;
    }

    await git.checkout(base);

    if (strategy === "squash") {
      if (!(await git.hasStagedChanges())) {
        await git.merge(branch, { squash: true, noVerify: options.noVerify });
      }
      const message = options.squashMessage ?? expandMessage("%b", { branch, base });
      await git.commit(message, { noVerify: options.noVerify });
    } else {
      const template = options.mergeMessage ?? `Merge branch '%b' into %p`;
      await git.merge(branch, {
        noFf: options.noFf ?? strategy !== "rebase",
        message: expandMessage(template, { branch, base }),
        noVerify: options.noVerify,
      });
    }
  }

  async resume(context: EngineWorkflowContext): Promise<void> {
    const { git, logger } = context.engineContext;
    const branch = context.state.data.branch as string;
    const targets = context.state.data.targets as string[];
    const base = targets[0];
    const options = context.state.data.options as FinishOptions;
    const strategy = context.state.data.strategy as string;

    // 1. اگر merge در حال انجام است
    if (await git.mergeInProgress()) {
      logger.debug("merge in progress, continuing...");
      if (strategy === "squash") {
        // برای squash، کاربر باید git add کرده باشد، حالا commit می‌کنیم
        if (await git.hasStagedChanges()) {
          const message = options.squashMessage ?? expandMessage("%b", { branch, base });
          await git.commit(message, { noVerify: options.noVerify });
        } else {
          throw new ConflictError(
            "No staged changes found after resolving conflicts",
            await git.conflictedFiles(),
          );
        }
      } else {
        // merge --continue
        await git.raw(["merge", "--continue"]);
      }
      return;
    }

    // 2. اگر rebase در حال انجام است
    if (await git.rebaseInProgress()) {
      logger.debug("rebase in progress, continuing...");
      await git.continueRebase(); // <-- استفاده از متد جدید
      return;
    }

    // 3. اگر هیچ عملیات git در حال انجام نیست، اما تغییرات staged وجود دارد (برای squash)
    if (strategy === "squash" && (await git.hasStagedChanges())) {
      const message = options.squashMessage ?? expandMessage("%b", { branch, base });
      await git.commit(message, { noVerify: options.noVerify });
      return;
    }

    // 4. بررسی کنید که آیا ادغام کامل شده است
    if (await git.isAncestor(branch, base)) {
      return;
    }

    // 5. در غیر این صورت، دوباره اجرا کنید
    await this.execute(context);
  }

  async rollback(context: EngineWorkflowContext): Promise<void> {
    const { git } = context.engineContext;
    if (await git.mergeInProgress()) {
      await git.abortMerge();
    }
    if (await git.rebaseInProgress()) {
      await git.abortRebase();
    }
  }

  async isCompleted(context: EngineWorkflowContext): Promise<boolean> {
    const { git } = context.engineContext;
    const targets = context.state.data.targets as string[];
    if (targets.length === 0) return true;
    const branch = context.state.data.branch as string;
    const base = targets[0];
    return await git.isAncestor(branch, base);
  }
}

/**
 * ایجاد تگ
 */
class TagStep implements WorkflowStep<EngineWorkflowContext> {
  readonly id = "tag";
  readonly title = "Create tag";

  async canExecute(context: EngineWorkflowContext): Promise<boolean> {
    // اگر نسخه‌گذاری فعال باشد و تگ ایجاد شده باشد، نیازی به TagStep نیست
    const versionData = context.state.data.versionBump as any;
    if (versionData?.tagCreated) return false;

    const options = context.state.data.options as FinishOptions;
    const shouldTag =
      options.tag ??
      context.engineContext.workflow.shouldTag(
        context.engineContext.workflow.requireBranchType(context.state.data.branchType as string),
      );
    if (!shouldTag) return false;

    // بررسی target شامل main
    const targets = context.state.data.targets as string[];
    return context.engineContext.workflow.shouldCreateTag(targets);
  }

  async execute(context: EngineWorkflowContext): Promise<void> {
    const { git } = context.engineContext;
    const options = context.state.data.options as FinishOptions;
    const branchType = context.engineContext.workflow.requireBranchType(
      context.state.data.branchType as string,
    );

    // از نسخه جدید استفاده کن
    const versionData = context.state.data.versionBump as any;
    let tagName: string;

    if (versionData?.tagName) {
      tagName = versionData.tagName;
    } else {
      // حالت fallback
      const prefix = context.engineContext.workflow.tagPrefixFor(branchType);
      tagName =
        options.tagName ?? `${prefix}${(context.state.data.branch as string).split("/").pop()}`;
    }

    // بررسی وجود تگ
    if ((await git.tags()).includes(tagName)) {
      context.engineContext.logger.debug(`tag ${tagName} already exists`);
      context.state.data.tag = tagName;
      return;
    }

    // ایجاد تگ
    await git.createTag(tagName, {
      message: options.message ?? versionData?.message ?? tagName,
      sign: options.sign,
      signingKey: options.signingKey,
    });

    context.state.data.tag = tagName;
    context.engineContext.logger.info(`✅ Tag created: ${tagName}`);
  }

  async resume(_context: EngineWorkflowContext): Promise<void> {}

  async rollback(context: EngineWorkflowContext): Promise<void> {
    // در صورت abort، تگ ایجادشده حذف می‌شود
    const { git } = context.engineContext;
    const createdTags = (context.state.data.createdTags as string[]) || [];
    for (const tag of createdTags) {
      if ((await git.tags()).includes(tag)) {
        await git.deleteTag(tag);
      }
    }
  }

  async isCompleted(_context: EngineWorkflowContext): Promise<boolean> {
    return true;
  }
}

/**
 * به‌روزرسانی شاخه‌های فرزند (auto-update children)
 */
class UpdateChildrenStep implements WorkflowStep<EngineWorkflowContext> {
  readonly id = "update-children";
  readonly title = "Update child branches";

  async canExecute(context: EngineWorkflowContext): Promise<boolean> {
    const targets = context.state.data.targets as string[];
    if (targets.length === 0) return false;
    const childNames = (context.state.data.childBranches as string[]) || [];
    return childNames.length > 0;
  }

  async execute(context: EngineWorkflowContext): Promise<void> {
    const { git, workflow, logger } = context.engineContext;
    const targets = context.state.data.targets as string[];
    const base = targets[0];
    const childNames = (context.state.data.childBranches as string[]) || [];
    const options = context.state.data.options as FinishOptions;
    const updated: string[] = [];

    for (const childName of childNames) {
      if (!(await git.branchExists(childName))) continue;
      const childBase = workflow.requireBase(childName);
      const baseBranch = childBase.base!;
      if (await git.isAncestor(baseBranch, childName)) {
        continue;
      }
      // ذخیره snapshot
      const snapshots = (context.state.data.snapshots as Record<string, string>) || {};
      if (!snapshots[childName]) {
        snapshots[childName] = await git.revParse(childName);
        context.state.data.snapshots = snapshots;
      }

      await git.checkout(childName);
      if (
        workflow.mergeStrategyFor(
          workflow.requireBranchType(context.state.data.branchType as string),
        ) === "rebase"
      ) {
        await git.rebase(baseBranch);
      } else {
        const template = options.updateMessage ?? `Merge branch '%p' into %b`;
        await git.merge(baseBranch, {
          noFf: true,
          message: expandMessage(template, { branch: childName, base: baseBranch }),
          noVerify: options.noVerify,
        });
      }
      updated.push(childName);
    }

    context.state.data.updatedBranches = updated;
  }

  async resume(_context: EngineWorkflowContext): Promise<void> {}
  async rollback(_context: EngineWorkflowContext): Promise<void> {}
  async isCompleted(_context: EngineWorkflowContext): Promise<boolean> {
    return true;
  }
}

/**
 * Push کردن تغییرات
 */
class PushStep implements WorkflowStep<EngineWorkflowContext> {
  readonly id = "push";
  readonly title = "Push changes";

  async canExecute(context: EngineWorkflowContext): Promise<boolean> {
    const options = context.state.data.options as FinishOptions;
    if (options.push !== true) return false;
    const remote = context.engineContext.workflow.remoteName;
    return await context.engineContext.git.remoteExists(remote);
  }

  async execute(context: EngineWorkflowContext): Promise<void> {
    const { git } = context.engineContext;
    const remote = context.engineContext.workflow.remoteName;
    const targets = context.state.data.targets as string[];
    const base = targets[0];
    const shouldTag = context.state.data.tag !== undefined;

    if (targets.length > 0) {
      await git.push(remote, base, { followTags: shouldTag });
    } else {
      const branch = context.state.data.branch as string;
      await git.push(remote, branch, { followTags: shouldTag });
    }

    const updated = (context.state.data.updatedBranches as string[]) || [];
    for (const child of updated) {
      await git.push(remote, child);
    }
  }

  async resume(_context: EngineWorkflowContext): Promise<void> {}
  async rollback(_context: EngineWorkflowContext): Promise<void> {}
  async isCompleted(_context: EngineWorkflowContext): Promise<boolean> {
    return true;
  }
}

/**
 * حذف شاخهٔ remote
 */
class DeleteRemoteStep implements WorkflowStep<EngineWorkflowContext> {
  readonly id = "delete-remote";
  readonly title = "Delete remote branch";

  async canExecute(context: EngineWorkflowContext): Promise<boolean> {
    const options = context.state.data.options as FinishOptions;
    if (options.keep === true || options.keepRemote === true) return false;
    const targets = context.state.data.targets as string[];
    if (targets.length === 0) return false;
    const branchType = context.engineContext.workflow.requireBranchType(
      context.state.data.branchType as string,
    );
    if (!context.engineContext.workflow.shouldDeleteOnFinish(branchType)) return false;
    const remote = context.engineContext.workflow.remoteName;
    const branch = context.state.data.branch as string;
    return (
      (await context.engineContext.git.remoteExists(remote)) &&
      (await context.engineContext.git.remoteBranchExists(remote, branch))
    );
  }

  async execute(context: EngineWorkflowContext): Promise<void> {
    const { git } = context.engineContext;
    const remote = context.engineContext.workflow.remoteName;
    const branch = context.state.data.branch as string;
    await git.push(remote, branch, { delete: true });
    context.state.data.deletedRemote = true;
  }

  async resume(_context: EngineWorkflowContext): Promise<void> {}
  async rollback(_context: EngineWorkflowContext): Promise<void> {}
  async isCompleted(_context: EngineWorkflowContext): Promise<boolean> {
    return true;
  }
}

/**
 * حذف شاخهٔ محلی
 */
class DeleteLocalStep implements WorkflowStep<EngineWorkflowContext> {
  readonly id = "delete-local";
  readonly title = "Delete local branch";

  async canExecute(context: EngineWorkflowContext): Promise<boolean> {
    const { git } = context.engineContext;
    // اگر هنوز merge یا rebase در حال انجام است، نمی‌توانیم حذف کنیم
    if ((await git.mergeInProgress()) || (await git.rebaseInProgress())) {
      return false;
    }

    const options = context.state.data.options as FinishOptions;
    if (options.keep === true) return false;
    const targets = context.state.data.targets as string[];
    if (targets.length === 0) return false;
    const branchType = context.engineContext.workflow.requireBranchType(
      context.state.data.branchType as string,
    );
    if (!context.engineContext.workflow.shouldDeleteOnFinish(branchType)) return false;
    const branch = context.state.data.branch as string;
    return await context.engineContext.git.branchExists(branch);
  }

  async execute(context: EngineWorkflowContext): Promise<void> {
    const { git } = context.engineContext;
    const branch = context.state.data.branch as string;
    const targets = context.state.data.targets as string[];
    const base = targets[0];
    const current = await git.currentBranch();
    if (current === branch) {
      await git.checkout(base);
    }
    const options = context.state.data.options as FinishOptions;
    const strategy = context.state.data.strategy as string;
    const force = options.forceDelete === true || strategy === "squash";
    await git.deleteBranch(branch, force);
    context.state.data.deletedLocal = true;
  }

  async resume(_context: EngineWorkflowContext): Promise<void> {}
  async rollback(_context: EngineWorkflowContext): Promise<void> {}
  async isCompleted(_context: EngineWorkflowContext): Promise<boolean> {
    return true;
  }
}

// ============================================================================
//  Step: Version Bump با تعامل کامل
// ============================================================================

class VersionBumpStep implements WorkflowStep<EngineWorkflowContext> {
  readonly id = "version-bump";
  readonly title = "Version management";

  async canExecute(context: EngineWorkflowContext): Promise<boolean> {
    const versioning = context.engineContext.workflow.config.versioning;
    if (!versioning?.enabled) return false;

    const branch: string = context.state.data.branch as string;
    const bumpType = context.engineContext.workflow.getVersionBumpForBranch(branch);
    return bumpType !== "none";
  }

  async execute(context: EngineWorkflowContext): Promise<void> {
    const { git, workflow, logger } = context.engineContext;
    const root = await git.root();
    const versioning = workflow.config.versioning;
    if (!versioning?.enabled) {
      logger.debug("Versioning is disabled, skipping version bump");
      return;
    }
    const versionPath = resolve(root, versioning.path ?? ".gitwe/VERSION.yaml");
    const versionDir = dirname(versionPath);
    if (!existsSync(versionDir)) {
      mkdirSync(versionDir, { recursive: true });
    }
    if (!existsSync(versionPath)) {
      const defaultContent = {
        version: "0.1.0",
        tagPrefix: "v",
        format: "{{tagPrefix}}{{major}}.{{minor}}.{{patch}}",
        tag: ["main"],
        bumpRules: {
          major: [],
          minor: ["feature"],
          patch: ["hotfix"],
        },
        autoCommit: true,
        commitMessage: "chore: bump version to {{version}}",
      };
      writeFileSync(versionPath, yaml.dump(defaultContent), "utf8");
    }
    // ===== 1. خواندن نسخه از هر دو منبع =====
    const pkgVersion = await git.getPackageVersion();
    const yamlVersion = await git.getVersionFromYaml(versionPath);

    // ===== 2. بررسی هم‌خوانی =====
    if (pkgVersion !== yamlVersion) {
      throw new Error(
        `Version mismatch!\n` +
          `  package.json:   ${pkgVersion}\n` +
          `  ${versionPath}: ${yamlVersion}\n` +
          `Please sync them manually before continuing.`,
      );
    }

    const currentVersion = pkgVersion; // هر دو برابر هستند

    // ===== 3. تعیین نوع bump =====
    const branch = context.state.data.branch as string;
    let bumpType = context.engineContext.workflow.getVersionBumpForBranch(branch);

    // ===== 4. اعمال override از خط فرمان =====
    const options = context.state.data.options as FinishOptions;
    if (bumpType !== "none") {
      if (options.major) bumpType = "major";
      else if (options.minor) bumpType = "minor";
      else if (options.patch) bumpType = "patch";
    }
    // ===== 5. محاسبه نسخه جدید =====
    if (bumpType === "none") {
      logger.debug("No version bump needed for this branch");
      context.state.data.versionBump = undefined;
      return;
    }
    const newVersion: string = git.bumpVersion(currentVersion, bumpType);

    // ===== 6. تولید نام تگ و پیام commit =====
    const tagPrefix = workflow.tagPrefixFor(
      workflow.requireBranchType(context.state.data.branchType as string),
    );
    const versionObj = git.parseVersion(newVersion) as {
      major: number;
      minor: number;
      patch: number;
      prerelease?: string;
    } | null;
    const format = versioning.format || "{{tagPrefix}}{{major}}.{{minor}}.{{patch}}";
    const tagName = git.renderTagName(format, {
      tagPrefix,
      major: versionObj?.major || 0,
      minor: versionObj?.minor || 0,
      patch: versionObj?.patch || 0,
      prerelease: versionObj?.prerelease || "",
    });

    const commitTemplate = versioning.commitMessage ?? "chore: bump version to {{version}}";
    const commitMessage = commitTemplate.replace(/\{\{version\}\}/g, String(newVersion));

    // ===== 7. بررسی شرط تگ‌زنی =====
    const targets = context.state.data.targets as string[];
    const shouldTag = workflow.shouldCreateTag(targets);

    // ===== 8. تعامل با کاربر =====
    const interactive =
      options.interactive !== false &&
      process.stdin.isTTY &&
      process.stdout.isTTY &&
      !process.env.CI; // غیرفعال در محیط CI
    let finalVersion: string = newVersion;
    let finalMessage: string = commitMessage;
    let skipVersion = false;

    if (interactive) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      try {
        console.log("\n" + style.bold("📦 Version Management"));
        console.log(`  ${style.dim("package.json:")}   ${style.green(String(currentVersion))}`);
        console.log(
          `  ${style.dim("VERSION.yaml:")}   ${style.green(String(yamlVersion))}  ✅ (synced)`,
        );
        console.log(`  ${style.dim("Bump type:")}      ${style.cyan(bumpType)}`);
        console.log(`  ${style.dim("New version:")}    ${style.yellow(String(newVersion))}`);
        console.log(`  ${style.dim("Tag name:")}       ${style.magenta(tagName)}`);
        console.log(`  ${style.dim("Target:")}         ${targets.join(", ")}`);
        if (shouldTag) {
          console.log(
            `  ${style.dim("Tag condition:")}  ${style.green("✅ target includes tag target")}`,
          );
        } else {
          console.log(
            `  ${style.dim("Tag condition:")}  ${style.yellow("ℹ️  target does not include tag target")}`,
          );
        }
        console.log(`  ${style.dim("Commit message:")} ${style.magenta(commitMessage)}`);
        console.log();

        // سؤال برای نسخه
        console.log(style.dim('Enter new version (or press Enter to accept, "skip" to skip):'));
        const versionAnswer = await rl.question("  Version: ");
        const trimmedVersion = versionAnswer.trim();

        if (trimmedVersion.toLowerCase() === "skip" || trimmedVersion.toLowerCase() === "s") {
          skipVersion = true;
          logger.info("Version bump skipped by user");
          return;
        }

        if (trimmedVersion !== "") {
          const parsedNew = git.parseVersion(trimmedVersion);
          if (parsedNew) {
            finalVersion = trimmedVersion;
          } else {
            console.log(
              style.yellow(`⚠️  "${trimmedVersion}" is not a valid version. Using ${newVersion}`),
            );
            finalVersion = newVersion;
          }
        }

        // سؤال برای پیام commit
        console.log("\n" + style.dim("Enter commit message (or press Enter to accept):"));
        const messageAnswer = await rl.question("  Message: ");
        if (messageAnswer.trim() !== "") {
          finalMessage = messageAnswer.trim();
        }
      } finally {
        rl.close();
      }
    } else {
      logger.info(`Version bump: ${currentVersion} → ${newVersion} (${bumpType})`);
    }

    if (skipVersion) {
      context.state.data.versionBump = undefined;
      return;
    }

    // ===== 9. بررسی وجود تگ =====
    if (shouldTag) {
      const tagExists = await git.tagExists(tagName);
      if (tagExists) {
        throw new Error(
          `Tag "${tagName}" already exists!\n` +
            `Please delete it manually or choose a different version.`,
        );
      }
    }

    // ===== 10. ذخیره در state =====
    context.state.data.versionBump = {
      current: currentVersion,
      new: finalVersion,
      type: bumpType,
      tagName: shouldTag ? tagName : undefined,
      message: finalMessage,
      shouldTag,
    };

    // ===== 11. ذخیره در VERSION.yaml =====
    if (finalVersion !== currentVersion) {
      await git.setVersionInYaml(versionPath, finalVersion);

      // ===== 12. commit خودکار =====
      if (versioning.autoCommit !== false) {
        await git.raw(["add", versionPath]);
        await git.commit(finalMessage, { noVerify: true });
        const versionBump = context.state.data.versionBump as VersionBumpData | undefined;
        if (versionBump) {
          versionBump.committed = true;
        }
        logger.info(`✅ Version bumped to ${finalVersion} and committed`);
      } else {
        logger.info(`✅ Version bumped to ${finalVersion} (saved in ${versionPath})`);
        logger.warn(`⚠️  autoCommit is disabled. Please commit manually:`);
        logger.warn(`    git add ${versionPath}`);
        logger.warn(`    git commit -m "${finalMessage}"`);
      }

      // ===== 13. ایجاد تگ (اگر شرط برقرار باشد) =====
      if (shouldTag) {
        await git.createTag(String(tagName), {
          message: finalMessage,
          sign: versioning.annotated !== false,
        });
        const versionBump = context.state.data.versionBump as VersionBumpData | undefined;
        if (versionBump) {
          versionBump.tagCreated = true;
        }
        logger.info(`✅ Tag ${tagName} created`);
      } else {
        logger.info(`ℹ️  No tag created (target "${targets.join(", ")}" not in tag list)`);
      }
    }
  }

  async resume(_context: EngineWorkflowContext): Promise<void> {}

  async rollback(_context: EngineWorkflowContext): Promise<void> {
    // در صورت abort، نیازی به بازگردانی نیست چون commit انجام شده است
  }

  async isCompleted(context: EngineWorkflowContext): Promise<boolean> {
    const data = context.state.data.versionBump as any;
    return data?.committed === true || data === undefined;
  }
}

/**
 * بازگشت به شاخهٔ نهایی و اجرای hook post-finish
 */
class CheckoutFinalStep implements WorkflowStep<EngineWorkflowContext> {
  readonly id = "checkout-final";
  readonly title = "Switch to final branch";

  async canExecute(context: EngineWorkflowContext): Promise<boolean> {
    const targets = context.state.data.targets as string[];
    return targets.length > 0;
  }

  async execute(context: EngineWorkflowContext): Promise<void> {
    const { git, hooks } = context.engineContext;
    const branch = context.state.data.branch as string;
    const targets = context.state.data.targets as string[];
    const base = targets[0];
    const updated = (context.state.data.updatedBranches as string[]) || [];
    const finalBranch = updated.length > 0 ? updated[updated.length - 1] : base;

    if (await git.branchExists(finalBranch)) {
      if ((await git.currentBranch()) !== finalBranch) {
        await git.checkout(finalBranch);
      }
    } else {
      if ((await git.currentBranch()) !== base) {
        await git.checkout(base);
      }
    }

    context.state.data.finalBranch = finalBranch;

    await hooks.run("post-finish", {
      branch,
      branchType: context.state.data.branchType as string,
      base,
    });
  }

  async resume(_context: EngineWorkflowContext): Promise<void> {}
  async rollback(_context: EngineWorkflowContext): Promise<void> {}
  async isCompleted(_context: EngineWorkflowContext): Promise<boolean> {
    return true;
  }
}

// ============================================================================
//  تابع ساخت Workflow
// ============================================================================

export function createFinishWorkflow(
  ctx: EngineContext,
  resolved: ResolvedBranch,
  options: FinishOptions,
): Workflow<EngineWorkflowContext> {
  // ===== محاسبه استراتژی =====
  const strategy = options.squash
    ? "squash"
    : options.rebase
      ? "rebase"
      : ctx.workflow.mergeStrategyFor(resolved.type);

  // ===== محاسبه فرزندان =====
  const targets = resolved.type.target;
  const children: BaseBranch[] = [];
  for (const target of targets) {
    for (const child of ctx.workflow.childrenOf(target)) {
      children.push(child);
    }
  }
  const childNames = children.map((c) => c.name);

  // ===== ایجاد state اولیه =====
  const initialState: OperationState = {
    version: 1,
    operation: "finish",
    currentStep: "",
    completedSteps: [],
    data: {
      branch: resolved.branch,
      branchType: resolved.type.name,
      options: { ...options },
      strategy, // <-- ذخیره استراتژی در data
      targets,
      childBranches: childNames,
      snapshots: {},
      createdTags: [],
      updatedBranches: [],
      deletedRemote: false,
      deletedLocal: false,
      finalBranch: targets[0] ?? resolved.type.base,
      tag: undefined,
      originalBranch: undefined,
    },
    startedAt: new Date().toISOString(),
  };

  // ساخت Stepها
  const steps: WorkflowStep<EngineWorkflowContext>[] = [
    new PreflightStep(),
    new FetchStep(),
    new RemoteSyncCheckStep(),
    new RebaseBranchStep(),
    new MergeIntoBaseStep(),
    new VersionBumpStep(),
    new TagStep(),
    new UpdateChildrenStep(),
    new PushStep(),
    new DeleteRemoteStep(),
    new DeleteLocalStep(),
    new CheckoutFinalStep(),
  ];

  return {
    id: "finish",
    title: "Finish topic branch",
    steps,
  };
}
