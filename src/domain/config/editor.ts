// src/domain/WorkflowEditor.ts
// عملیات ویرایش روی WorkflowConfig (بدون دخالت در سیستم فایل)
import { ConfigError } from "../errors.js";
import type { MergeStrategy, UpdateStrategy, WorkflowConfig } from "../entities.js";
import { parseWorkflowConfig } from "./parse.js";

// --- Typeهای ورودی برای ویرایش ---
export interface BaseBranchInput {
  parent?: string;
  upstreamStrategy?: MergeStrategy;
  downstreamStrategy?: UpdateStrategy;
  autoUpdate?: boolean;
}

export interface TopicTypeInput {
  parent?: string;
  prefix?: string;
  startPoint?: string;
  upstreamStrategy?: MergeStrategy;
  downstreamStrategy?: UpdateStrategy;
  tag?: boolean;
  tagPrefix?: string;
  deleteOnFinish?: boolean;
}

// --- Helpers ---
function clone(config: WorkflowConfig): WorkflowConfig {
  return JSON.parse(JSON.stringify(config)) as WorkflowConfig;
}

/**
 * پس از هر تغییر، دوباره parse کامل انجام می‌شود تا اعتبارسنجی نهایی اعمال شود.
 * این تضمین می‌کند که هیچ‌گاه یک Workflow ناقص ذخیره نمی‌شود.
 */
function revalidate(config: WorkflowConfig): WorkflowConfig {
  return parseWorkflowConfig(config);
}

// --- عملیات Base Branches ---
export function addBaseBranch(
  config: WorkflowConfig,
  name: string,
  input: BaseBranchInput = {},
): WorkflowConfig {
  const next = clone(config);
  if (next.baseBranches.some((b) => b.name === name)) {
    throw new ConfigError(`base branch "${name}" already exists`);
  }
  next.baseBranches.push({
    name,
    parent: input.parent,
    upstreamStrategy: input.upstreamStrategy ?? "merge",
    downstreamStrategy: input.downstreamStrategy ?? "merge",
    autoUpdate: input.autoUpdate ?? false,
  });
  return revalidate(next);
}

export function editBaseBranch(
  config: WorkflowConfig,
  name: string,
  input: BaseBranchInput,
): WorkflowConfig {
  const next = clone(config);
  const base = next.baseBranches.find((b) => b.name === name);
  if (base === undefined) throw new ConfigError(`unknown base branch "${name}"`);
  Object.assign(base, {
    parent: input.parent ?? base.parent,
    upstreamStrategy: input.upstreamStrategy ?? base.upstreamStrategy,
    downstreamStrategy: input.downstreamStrategy ?? base.downstreamStrategy,
    autoUpdate: input.autoUpdate ?? base.autoUpdate,
  });
  return revalidate(next);
}

export function renameBaseBranch(config: WorkflowConfig, from: string, to: string): WorkflowConfig {
  const next = clone(config);
  const base = next.baseBranches.find((b) => b.name === from);
  if (base === undefined) throw new ConfigError(`unknown base branch "${from}"`);
  base.name = to;

  // به‌روزرسانی ارجاعات در سایر Base Branches
  for (const other of next.baseBranches) {
    if (other.parent === from) other.parent = to;
  }
  // به‌روزرسانی ارجاعات در Topic Types
  for (const topic of next.topicTypes) {
    if (topic.parent === from) topic.parent = to;
    if (topic.startPoint === from) topic.startPoint = to;
  }
  return revalidate(next);
}

export function deleteBaseBranch(config: WorkflowConfig, name: string): WorkflowConfig {
  const next = clone(config);
  if (!next.baseBranches.some((b) => b.name === name)) {
    throw new ConfigError(`unknown base branch "${name}"`);
  }

  const dependents = [
    ...next.baseBranches.filter((b) => b.parent === name).map((b) => b.name),
    ...next.topicTypes.filter((t) => t.parent === name).map((t) => t.name),
  ];
  if (dependents.length > 0) {
    throw new ConfigError(`base branch "${name}" is still referenced by: ${dependents.join(", ")}`);
  }

  next.baseBranches = next.baseBranches.filter((b) => b.name !== name);
  return revalidate(next);
}

// --- عملیات Topic Types ---
export function addTopicType(
  config: WorkflowConfig,
  name: string,
  parent: string,
  input: TopicTypeInput = {},
): WorkflowConfig {
  const next = clone(config);
  if (next.topicTypes.some((t) => t.name === name)) {
    throw new ConfigError(`topic type "${name}" already exists`);
  }
  next.topicTypes.push({
    name,
    parent,
    prefix: input.prefix ?? `${name}/`,
    startPoint: input.startPoint,
    upstreamStrategy: input.upstreamStrategy ?? "merge",
    downstreamStrategy: input.downstreamStrategy ?? "merge",
    tag: input.tag ?? false,
    tagPrefix: input.tagPrefix,
    deleteOnFinish: input.deleteOnFinish ?? true,
  });
  return revalidate(next);
}

export function editTopicType(
  config: WorkflowConfig,
  name: string,
  input: TopicTypeInput,
): WorkflowConfig {
  const next = clone(config);
  const topic = next.topicTypes.find((t) => t.name === name);
  if (topic === undefined) throw new ConfigError(`unknown topic type "${name}"`);
  Object.assign(topic, {
    parent: input.parent ?? topic.parent,
    prefix: input.prefix ?? topic.prefix,
    startPoint: input.startPoint ?? topic.startPoint,
    upstreamStrategy: input.upstreamStrategy ?? topic.upstreamStrategy,
    downstreamStrategy: input.downstreamStrategy ?? topic.downstreamStrategy,
    tag: input.tag ?? topic.tag,
    tagPrefix: input.tagPrefix ?? topic.tagPrefix,
    deleteOnFinish: input.deleteOnFinish ?? topic.deleteOnFinish,
  });
  return revalidate(next);
}

export function renameTopicType(config: WorkflowConfig, from: string, to: string): WorkflowConfig {
  const next = clone(config);
  const topic = next.topicTypes.find((t) => t.name === from);
  if (topic === undefined) throw new ConfigError(`unknown topic type "${from}"`);
  topic.name = to;
  return revalidate(next);
}

export function deleteTopicType(config: WorkflowConfig, name: string): WorkflowConfig {
  const next = clone(config);
  if (!next.topicTypes.some((t) => t.name === name)) {
    throw new ConfigError(`unknown topic type "${name}"`);
  }
  next.topicTypes = next.topicTypes.filter((t) => t.name !== name);
  return revalidate(next);
}
