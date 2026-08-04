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
    return this.config.remote.name;
  }

  get remoteConfig(): RemoteConfig {
    return this.config.remote;
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
    return this.config.versioning.tag.includes(type.name);
  }

  mergeStrategyFor(type: BranchType): MergeStrategy {
    const configured = this.config.merge.branchTypes[type.name];
    if (configured === undefined) return this.config.merge.strategy;
    if (typeof configured === "string") return configured as MergeStrategy;
    for (const s of configured) {
      if (s === "merge" || s === "squash" || s === "rebase") {
        return s as MergeStrategy;
      }
    }
    return this.config.merge.strategy;
  }

  shouldDeleteOnFinish(type: BranchType): boolean {
    return this.config.merge.deleteOnFinish.includes(type.name);
  }

  allowSquash(type: BranchType): boolean {
    if (!this.config.merge.squash) return false;
    return this.config.merge.squash.branchTypes.includes(type.name);
  }

  versionBumpFor(type: BranchType): "major" | "minor" | "patch" | "none" {
    const vt = this.config.versioning.branchTypes;
    if (!vt) return "none";
    if (vt.major?.includes(type.name)) return "major";
    if (vt.minor?.includes(type.name)) return "minor";
    if (vt.patch?.includes(type.name)) return "patch";
    return "none";
  }

  tagPrefixFor(_type: BranchType): string {
    return this.config.versioning.tagPrefix;
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
}
