import { ValidationError } from "./errors.js";
import type { BaseBranch, BranchType, ResolvedBranch, WorkflowConfig } from "./entities.js";
import { VersionBumpType } from "./versioning/version-calculator.js";
import {
  resolvePushRemotes as resolveRemotes,
  defaultFetchRemotes,
  type RemoteConfig,
} from "./remote.js";
import type { MergeStrategy } from "./merge-strategy.js";

export class Workflow {
  readonly config: WorkflowConfig;

  constructor(config: WorkflowConfig) {
    this.config = config;
  }

  get remoteName(): string {
    const remote = this.config.remote;
    if (!remote) return "origin";
    const name = remote.name;
    if (typeof name === "string") return name;
    if (Array.isArray(name) && name.length > 0) return name[0];
    return "origin";
  }

  get remoteConfig(): RemoteConfig {
    return (
      this.config.remote ?? {
        name: "origin",
        autoFetch: true,
        fetch: ["origin"],
        autoPush: false,
        push: ["origin"],
      }
    );
  }
  /**
   * لیست ریموت‌هایی که باید برای push استفاده شوند.
   * اولویت: topic pushRemote > parent remote > workflow push
   */
  resolvePushRemotes(topicType: BranchType): string[] {
    const config = this.config;
    const topicPushRemote = (topicType as any).pushRemote;
    const parentRemote = defaultFetchRemotes(config?.remote as RemoteConfig);
    return resolveRemotes({
      workflowRemote: this.remoteConfig,
      topicPushRemote,
      parentRemote,
    }) as string[];
  }

  get baseBranches(): BaseBranch[] {
    return this.config.baseBranches;
  }

  get branchTypes(): BranchType[] {
    return this.config.branchTypes;
  }

  get rootBranch(): BaseBranch {
    const root = this.config.baseBranches.find((b) => b.base === undefined);
    return root ?? this.config.baseBranches[0];
  }

  findBase(name: string): BaseBranch | undefined {
    return this.config.baseBranches.find((b) => b.name === name);
  }

  requireBase(name: string): BaseBranch {
    const base = this.findBase(name);
    if (base === undefined) {
      throw new ValidationError(
        `"${name}" is not a base branch of the "${this.config.name}" workflow`,
        `known base branches: ${this.config.baseBranches.map((b) => b.name).join(", ")}`,
      );
    }
    return base;
  }

  findBranchType(nameOrAlias: string): BranchType | undefined {
    const value = nameOrAlias.trim().toLowerCase();
    return this.config.branchTypes.find((bt) => {
      if (bt.name.toLowerCase() === value) return true;
      return bt.aliases?.some((alias) => alias.toLowerCase() === value) ?? false;
    });
  }

  requireBranchType(nameOrAlias: string): BranchType {
    const bt = this.findBranchType(nameOrAlias);

    if (bt === undefined) {
      throw new ValidationError(
        `unknown branch type "${nameOrAlias}"`,
        `known types: ${this.config.branchTypes
          .map((bt) => {
            const aliases = bt.aliases?.length ? ` (${bt.aliases.join(", ")})` : "";

            return `${bt.name}${aliases}`;
          })
          .join(", ")}`,
      );
    }

    return bt;
  }

  findBranchTypeByAlias(alias: string): BranchType | undefined {
    return this.config.branchTypes.find((bt) => bt.aliases?.includes(alias));
  }

  childrenOf(name: string): BaseBranch[] {
    return this.config.baseBranches.filter((b) => b.base === name);
  }

  baseOf(type: BranchType): string {
    return type.base;
  }

  targetsOf(type: BranchType): string[] {
    return type.target;
  }

  shouldTag(type: BranchType): boolean {
    return (
      this.config.versioning?.enabled === true &&
      this.config.versioning.tag?.includes(type.name) === true
    );
  }

  mergeStrategyFor(type: BranchType): MergeStrategy {
    const merge = this.config.merge;
    if (!merge) return "merge";
    const configured = merge.branchTypes?.[type.name];
    if (configured === undefined) return merge.strategy ?? "merge";
    if (typeof configured === "string") return configured as MergeStrategy;
    for (const s of configured) {
      if (s === "merge" || s === "squash" || s === "rebase") {
        return s as MergeStrategy;
      }
    }
    return merge.strategy ?? "merge";
  }

  shouldDeleteOnFinish(type: BranchType): boolean {
    return this.config.merge?.deleteOnFinish?.includes(type.name) ?? false;
  }

  allowSquash(type: BranchType): boolean {
    const squash = this.config.merge?.squash;
    if (!squash) return false;
    return squash.branchTypes?.includes(type.name) ?? false;
  }

  versionBumpFor(type: BranchType): VersionBumpType {
    const rules = this.config.versioning?.bumpRules;

    if (!this.config.versioning?.enabled || !rules) {
      return "none";
    }

    if (rules.major?.includes(type.name)) {
      return "major";
    }

    if (rules.minor?.includes(type.name)) {
      return "minor";
    }

    if (rules.patch?.includes(type.name)) {
      return "patch";
    }

    if (rules.prerelease?.includes(type.name)) {
      return "prerelease";
    }

    return "none";
  }

  tagPrefixFor(_type: BranchType): string {
    return this.config.versioning?.tagPrefix ?? "v";
  }

  branchName(type: BranchType, shortName: string): string {
    return `${type.prefix}${shortName}`;
  }

  resolveBranch(branch: string): ResolvedBranch | undefined {
    const matches = this.config.branchTypes
      .filter((bt) => branch.startsWith(bt.prefix))
      .sort((a, b) => b.prefix.length - a.prefix.length);

    const type = matches[0];
    if (type === undefined) return undefined;

    const shortName = branch.slice(type.prefix.length);
    if (shortName === "") return undefined;

    return { branch, shortName, type };
  }

  resolveBranchType(type: BranchType, name: string): ResolvedBranch {
    const shortName = name.startsWith(type.prefix) ? name.slice(type.prefix.length) : name;
    if (shortName === "") {
      throw new ValidationError(`a ${type.name} name is required`);
    }
    return { branch: this.branchName(type, shortName), shortName, type };
  }

  isBaseBranch(branch: string): boolean {
    return this.findBase(branch) !== undefined;
  }

  /**
   * دریافت نوع افزایش نسخه برای یک شاخه خاص
   */
  getVersionBumpForBranch(branchName: string): VersionBumpType {
    const resolved = this.resolveBranch(branchName);
    if (!resolved) {
      return "none";
    }
    return this.versionBumpFor(resolved.type);
  }

  /**
   * دریافت لیست base branch‌هایی که تگ می‌خورند
   */
  getTagBranchTypes(): string[] {
    return this.config.versioning?.tag ?? [];
  }

  /**
   * بررسی اینکه آیا شاخه به یکی از tag targets ادغام می‌شود
   */
  shouldCreateTag(branchName: string): boolean {
    const versioning = this.config.versioning;

    if (!versioning?.enabled) {
      return false;
    }

    const resolved = this.resolveBranch(branchName);

    if (!resolved) {
      return false;
    }

    return versioning.tag?.includes(resolved.type.name) ?? false;
  }

  /**
   * اگر shortName شبیه semver باشد همان را برمی‌گرداند، وگرنه null.
   * مثال: "1.2.0" | "1.0.1-rc.1"
   */
  parseSemverName(shortName: string): string | null {
    const m = shortName.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
    return m ? shortName : null;
  }
}
