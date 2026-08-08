import { ValidationError } from "./errors.js";
import type {
  BaseBranch,
  BranchType,
  ResolvedBranch,
  WorkflowConfig,
  RemoteConfig,
  MergeStrategy,
} from "./entities.js";

export class Workflow {
  readonly config: WorkflowConfig;

  constructor(config: WorkflowConfig) {
    this.config = config;
  }

  get remoteName(): string {
    return this.config.remote?.name ?? "origin";
  }

  get remoteConfig(): RemoteConfig {
    return this.config.remote ?? { name: "origin" };
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

  findBranchType(name: string): BranchType | undefined {
    return this.config.branchTypes.find((bt) => bt.name === name);
  }

  requireBranchType(name: string): BranchType {
    const bt = this.findBranchType(name);
    if (bt === undefined) {
      throw new ValidationError(
        `unknown branch type "${name}"`,
        `known types: ${this.config.branchTypes.map((bt) => bt.name).join(", ")}`,
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
    return this.config.versioning?.tag?.includes(type.name) ?? false;
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

  versionBumpFor(type: BranchType): "major" | "minor" | "patch" | "none" {
    const vt = this.config.versioning?.branchTypes;
    if (!vt) return "none";
    if (vt.major?.includes(type.name)) return "major";
    if (vt.minor?.includes(type.name)) return "minor";
    if (vt.patch?.includes(type.name)) return "patch";
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
  getVersionBumpForBranch(branchName: string): "major" | "minor" | "patch" | "prerelease" | "none" {
    const resolved = this.resolveBranch(branchName);
    if (!resolved) return "none";

    const branchType = resolved.type;
    const bumpRules = this.config.versioning?.bumpRules;
    if (!bumpRules) return "none";

    if (bumpRules.major?.includes(branchType.name)) return "major";
    if (bumpRules.minor?.includes(branchType.name)) return "minor";
    if (bumpRules.patch?.includes(branchType.name)) return "patch";
    if (bumpRules.prerelease?.includes(branchType.name)) return "prerelease";
    return "none";
  }

  /**
   * دریافت لیست base branch‌هایی که تگ می‌خورند
   */
  getTagTargets(): string[] {
    return this.config.versioning?.tag ?? [];
  }

  /**
   * بررسی اینکه آیا شاخه به یکی از tag targets ادغام می‌شود
   */
  shouldCreateTag(targets: string[]): boolean {
    const tagTargets = this.getTagTargets();
    return targets.some((target) => tagTargets.includes(target));
  }
}
