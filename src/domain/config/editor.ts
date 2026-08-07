import { ConfigError } from "../errors.js";
import type { WorkflowConfig } from "../entities.js";
import { parseWorkflowConfig } from "./parse.js";

export interface BaseBranchInput {
  base?: string;
  protected?: boolean;
  aliases?: string[];
}

export interface BranchTypeInput {
  base?: string;
  target?: string[] | string;
  prefix?: string;
  aliases?: string[] | string;
}

function clone(config: WorkflowConfig): WorkflowConfig {
  return JSON.parse(JSON.stringify(config)) as WorkflowConfig;
}

function revalidate(config: WorkflowConfig): WorkflowConfig {
  return parseWorkflowConfig(config);
}

// --- Base Branches ---
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
    aliases: input.aliases,
    base: input.base,
    protected: input.protected ?? false,
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
    aliases: input.aliases ?? base.aliases,
    base: input.base ?? base.base,
    protected: input.protected ?? base.protected,
  });
  return revalidate(next);
}

export function renameBaseBranch(config: WorkflowConfig, from: string, to: string): WorkflowConfig {
  const next = clone(config);
  const base = next.baseBranches.find((b) => b.name === from);
  if (base === undefined) throw new ConfigError(`unknown base branch "${from}"`);
  base.name = to;

  // Update references in base branches
  for (const other of next.baseBranches) {
    if (other.base === from) other.base = to;
  }
  // Update references in branch types
  for (const bt of next.branchTypes) {
    if (bt.base === from) bt.base = to;
    bt.target = bt.target.map((t) => (t === from ? to : t));
  }
  return revalidate(next);
}

export function deleteBaseBranch(config: WorkflowConfig, name: string): WorkflowConfig {
  const next = clone(config);
  if (!next.baseBranches.some((b) => b.name === name)) {
    throw new ConfigError(`unknown base branch "${name}"`);
  }

  const dependents = [
    ...next.baseBranches.filter((b) => b.base === name).map((b) => b.name),
    ...next.branchTypes.filter((bt) => bt.base === name).map((bt) => bt.name),
    ...next.branchTypes.filter((bt) => bt.target.includes(name)).map((bt) => bt.name),
  ];
  if (dependents.length > 0) {
    throw new ConfigError(`base branch "${name}" is still referenced by: ${dependents.join(", ")}`);
  }

  next.baseBranches = next.baseBranches.filter((b) => b.name !== name);
  return revalidate(next);
}

// --- Branch Types ---
export function addBranchType(
  config: WorkflowConfig,
  name: string,
  base: string,
  target: string[] = [],
  input: BranchTypeInput = {},
): WorkflowConfig {
  const next = clone(config);
  if (next.branchTypes.some((bt) => bt.name === name)) {
    throw new ConfigError(`branch type "${name}" already exists`);
  }
  next.branchTypes.push({
    name,
    aliases: input.aliases as string[],
    base,
    target,
    prefix: input.prefix ?? `${name}/`,
  });
  return revalidate(next);
}

export function editBranchType(
  config: WorkflowConfig,
  name: string,
  input: BranchTypeInput,
): WorkflowConfig {
  const next = clone(config);
  const bt = next.branchTypes.find((b) => b.name === name);
  if (bt === undefined) throw new ConfigError(`unknown branch type "${name}"`);
  Object.assign(bt, {
    aliases: input.aliases ?? bt.aliases,
    base: input.base ?? bt.base,
    target: input.target ?? bt.target,
    prefix: input.prefix ?? bt.prefix,
  });
  return revalidate(next);
}

export function renameBranchType(config: WorkflowConfig, from: string, to: string): WorkflowConfig {
  const next = clone(config);
  const bt = next.branchTypes.find((b) => b.name === from);
  if (bt === undefined) throw new ConfigError(`unknown branch type "${from}"`);
  bt.name = to;

  // Update references in merge config
  const merge = next.merge;
  if (merge) {
    if (merge.branchTypes?.[from] !== undefined) {
      if (!merge.branchTypes) merge.branchTypes = {};
      merge.branchTypes[to] = merge.branchTypes[from];
      delete merge.branchTypes[from];
    }
    if (merge.deleteOnFinish) {
      merge.deleteOnFinish = merge.deleteOnFinish.map((n: string) => (n === from ? to : n));
    }
    if (merge.squash?.branchTypes) {
      merge.squash.branchTypes = merge.squash.branchTypes.map((n: string) => (n === from ? to : n));
    }
  }

  // Update references in versioning
  const versioning = next.versioning;
  if (versioning) {
    if (versioning.tag) {
      versioning.tag = versioning.tag.map((n) => (n === from ? to : n));
    }
    if (versioning.branchTypes) {
      for (const key of ["version", "major", "minor", "patch", "metadata"] as const) {
        if (versioning.branchTypes[key]) {
          versioning.branchTypes[key] = versioning.branchTypes[key]!.map((n) =>
            n === from ? to : n,
          );
        }
      }
    }
  }
  return revalidate(next);
}

export function deleteBranchType(config: WorkflowConfig, name: string): WorkflowConfig {
  const next = clone(config);
  if (!next.branchTypes.some((bt) => bt.name === name)) {
    throw new ConfigError(`unknown branch type "${name}"`);
  }
  next.branchTypes = next.branchTypes.filter((bt) => bt.name !== name);

  // Remove from merge config
  const merge = next.merge;
  if (merge) {
    if (merge.branchTypes) {
      delete merge.branchTypes[name];
    }
    if (merge.deleteOnFinish) {
      merge.deleteOnFinish = merge.deleteOnFinish.filter((n) => n !== name);
    }
    if (merge.squash?.branchTypes) {
      merge.squash.branchTypes = merge.squash.branchTypes.filter((n) => n !== name);
    }
  }

  // Remove from versioning
  const versioning = next.versioning;
  if (versioning) {
    if (versioning.tag) {
      versioning.tag = versioning.tag.filter((n) => n !== name);
    }
    if (versioning.branchTypes) {
      for (const key of ["version", "major", "minor", "patch", "metadata"] as const) {
        if (versioning.branchTypes[key]) {
          versioning.branchTypes[key] = versioning.branchTypes[key]!.filter((n) => n !== name);
        }
      }
    }
  }
  return revalidate(next);
}
