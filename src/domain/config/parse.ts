import { ConfigError } from "../errors.js";
import type {
  BaseBranch,
  BranchType,
  HookConfig,
  MergeStrategy,
  // UpdateStrategy,
  WorkflowConfig,
  RemoteConfig,
  VersioningConfig,
  MergeConfig,
  CliConfig,
} from "../entities.js";

const MERGE_STRATEGIES: MergeStrategy[] = ["merge", "squash", "rebase"];

// --- Helperها (بدون تغییر) ---
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

/**
 * Parses a value that should be a string or an array of strings.
 *
 * FIX: previously the "single string" branch skipped the empty-string check
 * that the "array of strings" branch enforced, so `"target": ""` silently
 * became `[""]` instead of failing fast the way `"target": [""]` already
 * did. That let an invalid `gitwe.json` (e.g. `branchTypes[*].target: ""`,
 * `versioning.branchTypes.major: [""]`) pass parsing and blow up later —
 * either with a confusing "unknown target """ validation error, or, if it
 * ever slipped past validation, as a runtime `git checkout ""` inside the
 * engine. Both branches now apply the exact same rule: every entry must be
 * a non-empty, trimmed string, or parsing fails immediately with a clear
 * message that names the offending field. Omitting the field entirely (or
 * `null`) is still fine and yields `[]`; a *blank* value is not.
 */
function parseStringArray(value: unknown, path: string): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      if (typeof item !== "string" || item.trim() === "") {
        throw new ConfigError(`${path}[${index}] must be a non-empty string`);
      }
      return item.trim();
    });
  }
  if (typeof value === "string") {
    if (value.trim() === "") {
      throw new ConfigError(`${path} must be a non-empty string`);
    }
    return [value.trim()];
  }
  throw new ConfigError(`${path} must be a string or array of strings`);
}

// --- پارس‌کننده‌ها ---
function parseBaseBranch(value: unknown, index: number): BaseBranch {
  if (!isRecord(value)) {
    throw new ConfigError(`baseBranches[${index}] must be an object`);
  }
  const path = `baseBranches[${index}]`;
  return {
    name: requireString(value.name, `${path}.name`),
    aliases: Array.isArray(value.aliases) ? value.aliases.map(String) : undefined,
    base: optionalString(value.base, `${path}.base`),
    protected: booleanValue(value.protected, `${path}.protected`, false),
  };
}

function parseBranchType(value: unknown, index: number): BranchType {
  if (!isRecord(value)) {
    throw new ConfigError(`branchTypes[${index}] must be an object`);
  }
  const path = `branchTypes[${index}]`;
  const name = requireString(value.name, `${path}.name`);
  return {
    name,
    aliases: Array.isArray(value.aliases) ? value.aliases.map(String) : undefined,
    base: requireString(value.base, `${path}.base`),
    target: parseStringArray(value.target, `${path}.target`),
    prefix: requireString(value.prefix, `${path}.prefix`, `${name}/`),
  };
}

function parseHooks(value: unknown): HookConfig {
  if (!isRecord(value)) {
    return { enabled: true, path: ".gitwe/hooks" };
  }
  return {
    enabled: booleanValue(value.enabled, "hooks.enabled", true),
    path: requireString(value.path, "hooks.path", ".gitwe/hooks"),
  };
}

function parseRemote(value: unknown): RemoteConfig {
  if (isRecord(value)) {
    return {
      name: requireString(value.name, "remote.name"),
      autoPush: booleanValue(value.autoPush, "remote.autoPush", false),
      autoFetch: booleanValue(value.autoFetch, "remote.autoFetch", true),
    };
  }
  // اگر string باشد، به object تبدیل کن
  if (typeof value === "string") {
    return { name: value };
  }
  return { name: "origin" };
}

function parseVersion(value: unknown): VersioningConfig {
  if (!isRecord(value)) {
    return {
      enabled: false,
      tagPrefix: "v",
      tag: [],
      branchTypes: {},
    };
  }
  return {
    enabled: booleanValue(value.enabled, "versioning.enabled", true),
    tagPrefix: requireString(value.tagPrefix, "versioning.tagPrefix", "v"),
    format: optionalString(value.format, "versioning.format") ?? "{{tagPrefix}}{{version}}",
    tag: parseStringArray(value.tag, "versioning.tag"),
    branchTypes: isRecord(value.branchTypes)
      ? {
          version: parseStringArray(value.branchTypes.version, "versioning.branchTypes.version"),
          major: parseStringArray(value.branchTypes.major, "versioning.branchTypes.major"),
          minor: parseStringArray(value.branchTypes.minor, "versioning.branchTypes.minor"),
          patch: parseStringArray(value.branchTypes.patch, "versioning.branchTypes.patch"),
          metadata: parseStringArray(value.branchTypes.metadata, "versioning.branchTypes.metadata"),
        }
      : {},
    annotated: booleanValue(value.annotated, "versioning.annotated", true),
    pushTags: booleanValue(value.pushTags, "versioning.pushTags", false),
    changelog: isRecord(value.changelog)
      ? {
          enabled: booleanValue(value.changelog.enabled, "versioning.changelog.enabled", false),
          path: optionalString(value.changelog.path, "versioning.changelog.path") ?? "CHANGELOG.md",
        }
      : undefined,
  };
}

function parseMerge(value: unknown): MergeConfig {
  if (!isRecord(value)) {
    return {
      strategy: "merge",
      branchTypes: {},
      deleteOnFinish: [],
    };
  }
  const branchTypes: Record<string, string | string[]> = {};
  if (isRecord(value.branchTypes)) {
    for (const [key, val] of Object.entries(value.branchTypes)) {
      if (typeof val === "string") {
        branchTypes[key] = val;
      } else if (Array.isArray(val)) {
        branchTypes[key] = val.map(String);
      }
    }
  }
  return {
    strategy: parseMergeStrategy(value.strategy, "merge.strategy", "merge"),
    branchTypes,
    deleteOnFinish: parseStringArray(value.deleteOnFinish, "merge.deleteOnFinish"),
    squash: isRecord(value.squash)
      ? {
          branchTypes: parseStringArray(value.squash.branchTypes, "merge.squash.branchTypes"),
          enabled: booleanValue(value.squash.enabled, "merge.squash.enabled", true),
          default: booleanValue(value.squash.default, "merge.squash.default", false),
        }
      : undefined,
  };
}

function parseCli(value: unknown): CliConfig | undefined {
  if (!isRecord(value)) return undefined;
  return {
    enabled: booleanValue(value.enabled, "cli.enabled", true),
    interactive: booleanValue(value.interactive, "cli.interactive", true),
    color: booleanValue(value.color, "cli.color", true),
    aliases: isRecord(value.aliases)
      ? Object.fromEntries(Object.entries(value.aliases).map(([k, v]) => [k, String(v)]))
      : undefined,
  };
}

function validateWorkflow(config: WorkflowConfig): void {
  if (config.baseBranches.length === 0) {
    throw new ConfigError("at least one base branch is required");
  }

  const bases = new Map<string, BaseBranch>();
  for (const base of config.baseBranches) {
    if (bases.has(base.name)) {
      throw new ConfigError(`duplicate base branch "${base.name}"`);
    }
    bases.set(base.name, base);
  }

  // Check base relationships
  for (const base of config.baseBranches) {
    if (base.base === undefined) continue;
    if (!bases.has(base.base)) {
      throw new ConfigError(`base branch "${base.name}" has unknown base "${base.base}"`);
    }
    if (base.base === base.name) {
      throw new ConfigError(`base branch "${base.name}" cannot be its own base`);
    }
  }

  // Check cycles
  for (const base of config.baseBranches) {
    const seen = new Set<string>([base.name]);
    let current = base.base;
    while (current !== undefined) {
      if (seen.has(current)) {
        throw new ConfigError(`base branch hierarchy contains a cycle at "${current}"`);
      }
      seen.add(current);
      const parent = bases.get(current);
      current = parent?.base;
    }
  }

  // Validate branch types
  //
  // FIX: this check used to run in parseWorkflowConfig, before any of the
  // base-branch checks above. That meant a config with both a duplicate
  // base branch AND no branchTypes always reported "branchTypes must be
  // defined and non-empty" — masking the base-branch error the caller was
  // actually trying to trigger/see. Running it here, after base branches
  // are validated, means base-branch problems are always reported first.
  if (config.branchTypes.length === 0) {
    throw new ConfigError("branchTypes must be defined and non-empty");
  }

  const names = new Set<string>();
  const prefixes = new Map<string, string>();

  for (const bt of config.branchTypes) {
    if (names.has(bt.name)) {
      throw new ConfigError(`duplicate branch type "${bt.name}"`);
    }
    names.add(bt.name);

    const owner = prefixes.get(bt.prefix);
    if (owner !== undefined) {
      throw new ConfigError(
        `branch types "${owner}" and "${bt.name}" share the prefix "${bt.prefix}"`,
      );
    }
    prefixes.set(bt.prefix, bt.name);

    if (!bases.has(bt.base)) {
      throw new ConfigError(`branch type "${bt.name}" has unknown base "${bt.base}"`);
    }

    // An empty `target` is allowed on purpose: it means this branch type is
    // never automatically merged anywhere (e.g. a long-lived "support"
    // branch). `finish`/`update` handle that case explicitly instead of
    // assuming every branch type has somewhere to merge into.
    for (const target of bt.target) {
      if (!bases.has(target)) {
        throw new ConfigError(`branch type "${bt.name}" has unknown target "${target}"`);
      }
    }
  }

  // Validate merge.deleteOnFinish
  for (const name of config.merge.deleteOnFinish) {
    if (!names.has(name)) {
      throw new ConfigError(`merge.deleteOnFinish references unknown branch type "${name}"`);
    }
  }

  // Validate merge.branchTypes keys
  for (const [key] of Object.entries(config.merge.branchTypes)) {
    if (!names.has(key)) {
      throw new ConfigError(`merge.branchTypes references unknown branch type "${key}"`);
    }
  }

  // Validate merge.squash.branchTypes
  if (config.merge.squash) {
    for (const name of config.merge.squash.branchTypes) {
      if (!names.has(name)) {
        throw new ConfigError(`merge.squash.branchTypes references unknown branch type "${name}"`);
      }
    }
  }

  // Validate versioning.tag
  for (const name of config.versioning.tag) {
    if (!names.has(name)) {
      throw new ConfigError(`versioning.tag references unknown branch type "${name}"`);
    }
  }

  // Validate versioning.branchTypes
  //
  // FIX: the old code special-cased `name !== ""` here because
  // parseStringArray used to be able to hand back `[""]`. Now that
  // parseStringArray always normalizes blank strings to `[]`, an empty
  // string can never reach this point — so the exception was dead code
  // that only masked the real bug. Removed for a single, consistent rule.
  if (config.versioning.branchTypes) {
    for (const [key, arr] of Object.entries(config.versioning.branchTypes)) {
      for (const name of arr) {
        if (!names.has(name)) {
          throw new ConfigError(
            `versioning.branchTypes.${key} references unknown branch type "${name}"`,
          );
        }
      }
    }
  }
}

export function parseWorkflowConfig(input: unknown): WorkflowConfig {
  if (!isRecord(input)) {
    throw new ConfigError("workflow definition must be an object");
  }

  if (input.version !== undefined && input.version !== 1) {
    throw new ConfigError(`unsupported workflow version ${String(input.version)}`);
  }

  const baseBranches = Array.isArray(input.baseBranches) ? input.baseBranches : undefined;
  if (baseBranches === undefined) {
    throw new ConfigError("baseBranches must be an array");
  }

  const branchTypes = Array.isArray(input.branchTypes) ? input.branchTypes : [];

  const config: WorkflowConfig = {
    version: 1,
    name: requireString(input.name, "name", "custom"),
    remote: parseRemote(input.remote),
    baseBranches: baseBranches.map(parseBaseBranch),
    branchTypes: branchTypes.map(parseBranchType),
    hooks: parseHooks(input.hooks),
    cli: parseCli(input.cli),
    merge: parseMerge(input.merge),
    versioning: parseVersion(input.versioning),
  };

  validateWorkflow(config);
  return config;
}
