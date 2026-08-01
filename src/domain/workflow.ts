// src/domain/Workflow.ts
// ویو (View) فقط خواندنی روی WorkflowConfig برای موتور و CLI
import { ValidationError } from "./errors.js";
import type { BaseBranch, ResolvedTopic, TopicType, WorkflowConfig } from "./entities.js";

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

  /** شاخهٔ ریشه (ریشه درخت) را برمی‌گرداند. */
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

  /** شاخه‌های Base که از `name` ارث‌بری می‌کنند (فرزندان). */
  childrenOf(name: string): BaseBranch[] {
    return this.config.baseBranches.filter((b) => b.parent === name);
  }

  /** نقطهٔ شروع پیش‌فرض برای ساخت یک Topic از نوع داده شده. */
  startPointOf(type: TopicType): string {
    return type.startPoint ?? type.parent;
  }

  /** پیشوند تگ برای یک Topic خاص. */
  tagPrefixOf(type: TopicType): string {
    return type.tagPrefix ?? this.config.tagPrefix;
  }

  /** نام کامل شاخه را از نوع و نام کوتاه می‌سازد. */
  branchName(type: TopicType, shortName: string): string {
    return `${type.prefix}${shortName}`;
  }

  /**
   * تلاش برای تطبیق یک نام شاخه با یکی از پیشوندهای Topic.
   * در صورت تطابق، شیء ResolvedTopic را برمی‌گرداند.
   */
  resolveBranch(branch: string): ResolvedTopic | undefined {
    // مرتب‌سازی بر اساس طول پیشوند (طولانی‌ترین اولویت دارد)
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
   * تبدیل ورودی کاربر (نام کوتاه یا کامل) به ResolvedTopic.
   * اگر نام با پیشوند شروع شود، آن را حذف می‌کند.
   */
  resolveTopic(type: TopicType, name: string): ResolvedTopic {
    const shortName = name.startsWith(type.prefix) ? name.slice(type.prefix.length) : name;
    if (shortName === "") {
      throw new ValidationError(`a ${type.name} name is required`);
    }
    return { branch: this.branchName(type, shortName), shortName, type };
  }

  /** بررسی می‌کند که آیا یک نام شاخه، جزو Base Branches است؟ */
  isBaseBranch(branch: string): boolean {
    return this.findBase(branch) !== undefined;
  }
}
