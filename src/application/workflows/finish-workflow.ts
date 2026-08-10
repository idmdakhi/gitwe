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
import { VersionCalculator } from "../../domain/versioning/version-calculator.js";

interface VersionBumpData {
  current: string;
  new: string;
  type: string;
  message: string;
  committed?: boolean;
  tagName?: string;
  shouldTag?: boolean;
  tagCreated?: boolean;
}
// ============================================================================
//  پیاده‌سازی WorkflowContext برای موتور
// ============================================================================

export class EngineWorkflowContext implements WorkflowContext {
  readonly operation: string;
  readonly resolvedBranch: ResolvedBranch;
  private _state: OperationState;
  private readonly store: EngineContext["state"];
  private readonly logger: EngineContext["logger"];

  constructor(
    private readonly ctx: EngineContext,
    resolvedBranch: ResolvedBranch,
    operation: string,
    initialState: OperationState,
  ) {
    this.operation = operation;
    this.resolvedBranch = resolvedBranch;
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

// ============================================================================
//  Step: Version Bump با تعامل کامل
// ============================================================================

class VersionBumpStep implements WorkflowStep<EngineWorkflowContext> {
  readonly id = "version-bump";
  readonly title = "Bump version";

  async canExecute(context: EngineWorkflowContext): Promise<boolean> {
    const { workflow } = context.engineContext;
    if (!workflow.config.versioning?.enabled) {
      return false;
    }
    const type = context.resolvedBranch?.type;
    if (!type) {
      return false;
    }
    return workflow.versionBumpFor(type) !== "none";
  }

  async execute(context: EngineWorkflowContext): Promise<void> {
    const { git, workflow, logger } = context.engineContext;

    const versioning = workflow.config.versioning;

    if (!versioning?.enabled) {
      return;
    }

    const root = await git.root();

    const versionPath = resolve(root, versioning.path ?? ".gitwe/VERSION.yaml");

    /*
     * 1. Read current version
     */
    const packageVersion = await git.getPackageVersion();

    const yamlVersion = await git.getVersionFromYaml(versionPath);

    /*
     * 2. Versions must be equal
     */
    if (packageVersion !== yamlVersion) {
      throw new Error(
        [
          "Version mismatch!",
          `package.json: ${packageVersion}`,
          `${versionPath}: ${yamlVersion}`,
        ].join("\n"),
      );
    }

    /*
     * 3. Determine bump
     */

    let bumpType = workflow.versionBumpFor(context.resolvedBranch.type);

    if (bumpType === "none") {
      return;
    }

    /*
     * 4. CLI override
     */
    const options = context.state.data.options as FinishOptions;

    if (options.major) {
      bumpType = "major";
    } else if (options.minor) {
      bumpType = "minor";
    } else if (options.patch) {
      bumpType = "patch";
    }
    // if (bumpType === "prerelease") {
    //   throw new Error("Prerelease version bump is not supported by Git Flow versioning yet.");
    // }
    /*
     * 5. Calculate next version
     */
    // const newVersion = git.bumpVersion(packageVersion, bumpType);
    const newVersion = VersionCalculator.bump(packageVersion, bumpType);

    /*
     * 6. Update VERSION.yaml
     */
    await git.setVersionInYaml(versionPath, newVersion);

    /*
     * 7. Update package.json
     */
    await git.setPackageVersion(newVersion);

    /*
     * 8. Commit
     */
    const template = versioning.commitMessage ?? "chore: bump version to {{version}}";

    const message = template.replace("{{version}}", newVersion);

    if (versioning.autoCommit !== false) {
      await git.raw(["add", "--", versionPath, "package.json"]);

      await git.commit(message, {
        noVerify: options.noVerify,
      });
    }

    context.state.data.versionBump = {
      current: packageVersion,
      new: newVersion,
      type: bumpType,
      message,
      committed: versioning.autoCommit !== false,
    };
    logger.info(`Version: ${packageVersion} → ${newVersion}`);
  }

  async resume(context: EngineWorkflowContext): Promise<void> {
    await this.execute(context);
  }

  async rollback(_context: EngineWorkflowContext): Promise<void> {
    /*
     * Git workflow rollback handles
     * repository-level recovery.
     */
  }

  async isCompleted(context: EngineWorkflowContext): Promise<boolean> {
    const data = context.state.data.versionBump as VersionBumpData | undefined;

    return data?.committed === true;
  }
}

/**
 * ایجاد تگ
 */
class TagStep implements WorkflowStep {
  readonly id = "tag";
  readonly title = "Create tag";

  async canExecute(context: EngineWorkflowContext): Promise<boolean> {
    const { workflow } = context.engineContext;

    if (!workflow.config.versioning?.enabled) {
      return false;
    }
    const type = context.resolvedBranch.type;

    const result = workflow.shouldTag(type);

    return result;
  }

  async execute(context: EngineWorkflowContext): Promise<void> {
    const { git, workflow } = context.engineContext;

    const versioning = workflow.config.versioning!;

    const data = context.state.data.versionBump as VersionBumpData | undefined;

    if (!data) {
      return;
    }

    const version = git.parseVersion(data.new);

    if (!version) {
      throw new Error(`Invalid version: ${data.new}`);
    }

    const tagName = git.renderTagName(
      versioning.format ?? "{{tagPrefix}}{{major}}.{{minor}}.{{patch}}",
      {
        tagPrefix: versioning.tagPrefix ?? "v",
        major: version.major,
        minor: version.minor,
        patch: version.patch,
        prerelease: version.prerelease ?? "",
      },
    );

    if (await git.tagExists(tagName)) {
      throw new Error(`Tag already exists: ${tagName}`);
    }

    await git.createTag(tagName, {
      message: data.message,
    });

    data.tagCreated = true;

    context.state.data.tag = tagName;
  }

  async resume(context: EngineWorkflowContext): Promise<void> {
    await this.execute(context);
  }

  async rollback(context: EngineWorkflowContext): Promise<void> {
    const { git } = context.engineContext;

    const tag = context.state.data.tag as string | undefined;

    if (tag && (await git.tagExists(tag))) {
      await git.deleteTag(tag);
    }
  }

  async isCompleted(context: EngineWorkflowContext): Promise<boolean> {
    const data = context.state.data.versionBump as VersionBumpData | undefined;

    return data?.tagCreated === true;
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

export { VersionBumpStep, TagStep };
