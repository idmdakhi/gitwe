import { ValidationError } from "./errors.js";
import type { BaseBranch, ResolvedTopic, TopicType, WorkflowConfig } from "./types.js";

/** Read-only view over a workflow definition with the lookups the engine needs. */
export class Workflow {
  readonly config: WorkflowConfig;

  constructor(config: WorkflowConfig) {
    this.config = config;
  }

  get remote(): string {
    return this.config.remote;
  }

  get baseBranches(): BaseBranch[] {
    return this.config.baseBranches;
  }

  get topicTypes(): TopicType[] {
    return this.config.topicTypes;
  }

  /** The branch every other base branch descends from. */
  get rootBranch(): BaseBranch {
    const root = this.config.baseBranches.find((b) => b.parent === undefined);
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

  findTopicType(name: string): TopicType | undefined {
    return this.config.topicTypes.find((t) => t.name === name);
  }

  requireTopicType(name: string): TopicType {
    const type = this.findTopicType(name);
    if (type === undefined) {
      throw new ValidationError(
        `unknown topic type "${name}"`,
        `known topic types: ${this.config.topicTypes.map((t) => t.name).join(", ")}`,
      );
    }
    return type;
  }

  /** Base branches that are updated when `name` receives new commits. */
  childrenOf(name: string): BaseBranch[] {
    return this.config.baseBranches.filter((b) => b.parent === name);
  }

  /** Where a new topic branch of `type` is created from. */
  startPointOf(type: TopicType): string {
    return type.startPoint ?? type.parent;
  }

  tagPrefixOf(type: TopicType): string {
    return type.tagPrefix ?? this.config.tagPrefix;
  }

  branchName(type: TopicType, shortName: string): string {
    return `${type.prefix}${shortName}`;
  }

  /** Match a full branch name against the configured topic prefixes. */
  resolveBranch(branch: string): ResolvedTopic | undefined {
    const matches = this.config.topicTypes
      .filter((type) => branch.startsWith(type.prefix))
      .sort((a, b) => b.prefix.length - a.prefix.length);
    const type = matches[0];
    if (type === undefined) return undefined;
    const shortName = branch.slice(type.prefix.length);
    if (shortName === "") return undefined;
    return { branch, shortName, type };
  }

  /**
   * Resolve a user-supplied topic reference. `name` may be a short name
   * (`login`) or a full branch name (`feature/login`).
   */
  resolveTopic(type: TopicType, name: string): ResolvedTopic {
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
