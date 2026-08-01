// src/domain/WorkflowParser.ts
// تبدیل داده‌های خام (از JSON/YAML) به موجودیت‌های معتبر دامنه
import { ConfigError } from "../errors.js";
import type {
  BaseBranch,
  HookConfig,
  MergeStrategy,
  TopicType,
  UpdateStrategy,
  WorkflowConfig,
} from "../entities.js";

const MERGE_STRATEGIES: MergeStrategy[] = ["merge", "squash", "rebase"];
const UPDATE_STRATEGIES: UpdateStrategy[] = ["merge", "rebase"];

// --- Helperهای محض ---
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, path: string, fallback?: string): string {
  if (value === undefined || value === null) {
    if (fallback !== undefined) return fallback;
    throw new ConfigError(`${path} is required`);
  }
  if (typeof value !== "string" || value.trim() === "") {
    throw new ConfigError(`${path} must be a non-empty string`);
  }
  return value;
}

function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return requireString(value, path);
}

function booleanValue(value: unknown, path: string, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "boolean") {
    throw new ConfigError(`${path} must be a boolean`);
  }
  return value;
}

function parseMergeStrategy(value: unknown, path: string, fallback: MergeStrategy): MergeStrategy {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string" || !MERGE_STRATEGIES.includes(value as MergeStrategy)) {
    throw new ConfigError(`${path} must be one of: ${MERGE_STRATEGIES.join(", ")}`);
  }
  return value as MergeStrategy;
}

function parseUpdateStrategy(
  value: unknown,
  path: string,
  fallback: UpdateStrategy,
): UpdateStrategy {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string" || !UPDATE_STRATEGIES.includes(value as UpdateStrategy)) {
    throw new ConfigError(`${path} must be one of: ${UPDATE_STRATEGIES.join(", ")}`);
  }
  return value as UpdateStrategy;
}

// --- پارس‌کننده‌های اصلی ---
function parseBaseBranch(value: unknown, index: number): BaseBranch {
  if (!isRecord(value)) {
    throw new ConfigError(`baseBranches[${index}] must be an object`);
  }
  const path = `baseBranches[${index}]`;
  return {
    name: requireString(value.name, `${path}.name`),
    parent: optionalString(value.parent, `${path}.parent`),
    upstreamStrategy: parseMergeStrategy(
      value.upstreamStrategy,
      `${path}.upstreamStrategy`,
      "merge",
    ),
    downstreamStrategy: parseUpdateStrategy(
      value.downstreamStrategy,
      `${path}.downstreamStrategy`,
      "merge",
    ),
    autoUpdate: booleanValue(value.autoUpdate, `${path}.autoUpdate`, false),
  };
}

function parseTopicType(value: unknown, index: number): TopicType {
  if (!isRecord(value)) {
    throw new ConfigError(`topicTypes[${index}] must be an object`);
  }
  const path = `topicTypes[${index}]`;
  const name = requireString(value.name, `${path}.name`);
  return {
    name,
    parent: requireString(value.parent, `${path}.parent`),
    prefix: requireString(value.prefix, `${path}.prefix`, `${name}/`),
    startPoint: optionalString(value.startPoint, `${path}.startPoint`),
    upstreamStrategy: parseMergeStrategy(
      value.upstreamStrategy,
      `${path}.upstreamStrategy`,
      "merge",
    ),
    downstreamStrategy: parseUpdateStrategy(
      value.downstreamStrategy,
      `${path}.downstreamStrategy`,
      "merge",
    ),
    tag: booleanValue(value.tag, `${path}.tag`, false),
    tagPrefix: optionalString(value.tagPrefix, `${path}.tagPrefix`),
    deleteOnFinish: booleanValue(value.deleteOnFinish, `${path}.deleteOnFinish`, true),
  };
}

function parseHooks(value: unknown): HookConfig {
  if (value === undefined || value === null) {
    return { enabled: true, path: ".gitwe/hooks" };
  }
  if (!isRecord(value)) {
    throw new ConfigError("hooks must be an object");
  }
  return {
    enabled: booleanValue(value.enabled, "hooks.enabled", true),
    path: requireString(value.path, "hooks.path", ".gitwe/hooks"),
  };
}

// --- اعتبارسنجی ساختاری (Cross-field validation) ---
function validateWorkflow(config: WorkflowConfig): void {
  // ۱. حداقل یک Base Branch
  if (config.baseBranches.length === 0) {
    throw new ConfigError("at least one base branch is required");
  }

  // ۲. عدم تکراری بودن نام Base و وجود والد
  const bases = new Map<string, BaseBranch>();
  for (const base of config.baseBranches) {
    if (bases.has(base.name)) {
      throw new ConfigError(`duplicate base branch "${base.name}"`);
    }
    bases.set(base.name, base);
  }

  for (const base of config.baseBranches) {
    if (base.parent === undefined) continue;
    if (!bases.has(base.parent)) {
      throw new ConfigError(`base branch "${base.name}" has unknown parent "${base.parent}"`);
    }
    if (base.parent === base.name) {
      throw new ConfigError(`base branch "${base.name}" cannot be its own parent`);
    }
  }

  // ۳. تشخیص چرخه (Cycle) در درخت Base Branches
  for (const base of config.baseBranches) {
    const seen = new Set<string>([base.name]);
    let current = bases.get(base.name)?.parent;
    while (current !== undefined) {
      if (seen.has(current)) {
        throw new ConfigError(`base branch hierarchy contains a cycle at "${current}"`);
      }
      seen.add(current);
      current = bases.get(current)?.parent;
    }
  }

  // ۴. اعتبارسنجی Topic Types
  const topics = new Set<string>();
  const prefixes = new Map<string, string>(); // کلید: پیشوند، مقدار: نام نوع

  for (const topic of config.topicTypes) {
    if (topics.has(topic.name)) {
      throw new ConfigError(`duplicate topic type "${topic.name}"`);
    }
    topics.add(topic.name);

    const owner = prefixes.get(topic.prefix);
    if (owner !== undefined) {
      throw new ConfigError(
        `topic types "${owner}" and "${topic.name}" share the prefix "${topic.prefix}"`,
      );
    }
    prefixes.set(topic.prefix, topic.name);

    if (!bases.has(topic.parent)) {
      throw new ConfigError(
        `topic type "${topic.name}" has unknown parent branch "${topic.parent}"`,
      );
    }
  }
}

/**
 * نقطهٔ ورودی اصلی: دادهٔ خام (معمولاً از JSON یا YAML) را گرفته،
 * آن را به ساختار دامنه تبدیل کرده و اعتبارسنجی می‌کند.
 */
export function parseWorkflowConfig(input: unknown): WorkflowConfig {
  if (!isRecord(input)) {
    throw new ConfigError("workflow definition must be an object");
  }

  // پشتیبانی از نسخه
  if (input.version !== undefined && input.version !== 1) {
    throw new ConfigError(
      `unsupported workflow version ${String(input.version)}`,
      "gitwe 1.x only understands version 1",
    );
  }

  const baseBranches = Array.isArray(input.baseBranches) ? input.baseBranches : undefined;
  if (baseBranches === undefined) {
    throw new ConfigError("baseBranches must be an array");
  }

  const topicTypes = Array.isArray(input.topicTypes) ? input.topicTypes : [];

  const config: WorkflowConfig = {
    version: 1,
    name: requireString(input.name, "name", "custom"),
    remote: requireString(input.remote, "remote", "origin"),
    tagPrefix: typeof input.tagPrefix === "string" ? input.tagPrefix : "v",
    baseBranches: baseBranches.map(parseBaseBranch),
    topicTypes: topicTypes.map(parseTopicType),
    hooks: parseHooks(input.hooks),
  };

  // اعمال اعتبارسنجی‌های سنگین
  validateWorkflow(config);
  return config;
}
