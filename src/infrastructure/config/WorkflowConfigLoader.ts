import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { Workflow } from "#gitwe/domain/aggregates/Workflow";
import { BranchTypeRule, AutoTagConfig } from "#gitwe/domain/valueObjects/BranchTypeRule";
import { HookDefinition } from "#gitwe/domain/hooks/HookDefinition";
import { RemoteConfig } from "#gitwe/domain/valueObjects/RemoteConfig";
import { BranchNamingPolicy, BranchNameCase } from "#gitwe/domain/valueObjects/BranchNamingPolicy";
import { ConventionalCommitPolicy } from "#gitwe/domain/policies/ConventionalCommitPolicy";
import type { MergeStrategy } from "#gitwe/domain/valueObjects/MergeStrategy";
import { InvalidWorkflowDefinitionError } from "#gitwe/domain/errors";
import type { WorkflowConfigReader } from "#gitwe/application/ports/WorkflowConfigReader";
import { VersionBump } from "#gitwe/domain/valueObjects/VersionBump";

/**
 * Raw config shape as authored in `gitwe.json`/`gitwe.yaml`. This is
 * intentionally permissive — most sections are optional with defaults —
 * and accepts a couple of legacy field name aliases (`baseBranch` for
 * `base`, `mergeTargets` for `target`, `deleteOnFinish` for
 * `deleteAfterFinish`) so older flat-style configs keep working.
 */
interface RawBranchType {
  name?: string; // filled in from the object key when using the `types` map form
  prefix: string;
  base?: string;
  baseBranch?: string; // legacy alias for `base`
  target?: string | string[];
  mergeTargets?: string[]; // legacy alias for `target`
  deleteAfterFinish?: boolean;
  deleteOnFinish?: boolean; // legacy alias for `deleteAfterFinish`
  tag?: boolean | { prefix?: string; pattern?: string };
  autoTag?: { prefix?: string; pattern?: string }; // legacy alias for `tag: {...}`
  bumpVersion?: VersionBump;
}

interface RawBranchInfo {
  protected?: boolean;
}

interface RawMergeConfig {
  strategy?: MergeStrategy;
  deleteSource?: boolean;
  bumpVersion?: VersionBump;
}

interface RawTagConfig {
  enabled?: boolean;
  prefix?: string;
}

interface RawCommitConfig {
  conventional?: { enabled?: boolean };
}

interface RawBranchNamingConfig {
  case?: BranchNameCase;
  maxLength?: number;
  pattern?: string;
}

interface RawWorkflow {
  version?: number;
  workflow?: string; // used as the resulting Workflow's display name
  name?: string; // legacy alias for `workflow`
  branches?: Record<string, RawBranchInfo>;
  types?: Record<string, RawBranchType>;
  branchTypes?: RawBranchType[]; // legacy alias for `types` (array form, name embedded in each entry)
  merge?: RawMergeConfig;
  tag?: RawTagConfig;
  commit?: RawCommitConfig;
  branchNaming?: RawBranchNamingConfig;
  hooks?: {
    preStart?: string[];
    postStart?: string[];
    preFinish?: string[];
    postFinish?: string[];
  };
  remote?: { remote?: string; autoPush?: boolean; autoPull?: boolean };
}

/**
 * Loads a `Workflow` aggregate from a JSON or YAML file on disk. This is
 * the only config-loading code in the codebase, and the single place that
 * understands the on-disk schema — everything past this file works with
 * the domain's own value objects, never raw JSON shapes.
 */
export class WorkflowConfigLoader implements WorkflowConfigReader {
  load(filePath: string): Workflow {
    if (!fs.existsSync(filePath)) {
      throw new InvalidWorkflowDefinitionError(`config file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const ext = path.extname(filePath).toLowerCase();
    const parsed: unknown =
      ext === ".yaml" || ext === ".yml" ? yaml.load(content) : JSON.parse(content);

    if (typeof parsed !== "object" || parsed === null) {
      throw new InvalidWorkflowDefinitionError("config must be a JSON/YAML object");
    }

    return this.toWorkflow(parsed as RawWorkflow, filePath);
  }

  private toWorkflow(raw: RawWorkflow, filePath: string): Workflow {
    const name = raw.workflow ?? raw.name;
    if (!name) {
      throw new InvalidWorkflowDefinitionError(
        `"${filePath}" is missing a "workflow" (or "name") field`,
      );
    }

    const globalTag: RawTagConfig = raw.tag ?? {};
    const globalMerge: RawMergeConfig = raw.merge ?? {};

    const branchTypes = this.resolveBranchTypes(raw, globalTag, globalMerge);
    const protectedBranches = Object.entries(raw.branches ?? {})
      .filter(([, info]) => info.protected)
      .map(([branchName]) => branchName);

    return Workflow.create({
      name,
      branchTypes,
      hooks: raw.hooks ? HookDefinition.create(raw.hooks) : undefined,
      remote: raw.remote ? RemoteConfig.create(raw.remote) : undefined,
      protectedBranches,
      branchNaming: raw.branchNaming
        ? BranchNamingPolicy.create({
            case: raw.branchNaming.case,
            maxLength: raw.branchNaming.maxLength,
            pattern: raw.branchNaming.pattern,
          })
        : undefined,
      mergeStrategy: globalMerge.strategy,
      commitPolicy: raw.commit?.conventional
        ? ConventionalCommitPolicy.create({ enabled: raw.commit.conventional.enabled })
        : undefined,
    });
  }

  private resolveBranchTypes(
    raw: RawWorkflow,
    globalTag: RawTagConfig,
    globalMerge: RawMergeConfig,
  ): BranchTypeRule[] {
    const entries: [string, RawBranchType][] = raw.types
      ? Object.entries(raw.types)
      : (raw.branchTypes ?? []).map((t) => [t.name ?? "", t]);

    if (entries.length === 0) {
      throw new InvalidWorkflowDefinitionError(
        'config must define at least one branch type under "types"',
      );
    }

    return entries.map(([typeName, type]) => {
      const name = type.name ?? typeName;
      const baseBranch = type.base ?? type.baseBranch;
      if (!baseBranch) {
        throw new InvalidWorkflowDefinitionError(`branch type "${name}" is missing "base"`);
      }

      const rawTargets = type.target ?? type.mergeTargets;
      if (!rawTargets) {
        throw new InvalidWorkflowDefinitionError(`branch type "${name}" is missing "target"`);
      }
      const mergeTargets = Array.isArray(rawTargets) ? rawTargets : [rawTargets];

      const deleteOnFinish =
        type.deleteAfterFinish ?? type.deleteOnFinish ?? globalMerge.deleteSource ?? true;
      const autoTag = this.resolveAutoTag(type, globalTag);

      const bumpVersion = type.bumpVersion ?? globalMerge.bumpVersion ?? "patch";

      return BranchTypeRule.create({
        name,
        prefix: type.prefix,
        baseBranch,
        mergeTargets,
        deleteOnFinish,
        autoTag,
        bumpVersion,
      });
    });
  }

  /**
   * Reconciles a branch type's `tag` setting (boolean shorthand or an
   * object override) with the workflow-level `tag.enabled`/`tag.prefix`
   * defaults into a single `AutoTagConfig`, or `undefined` if this type
   * doesn't tag at all.
   */
  private resolveAutoTag(type: RawBranchType, globalTag: RawTagConfig): AutoTagConfig | undefined {
    if (type.autoTag) return type.autoTag; // legacy explicit override takes precedence

    if (type.tag === undefined || type.tag === false) return undefined;
    if (globalTag.enabled === false) return undefined; // globally disabled overrides a per-type `tag: true`

    if (type.tag === true) {
      return { prefix: globalTag.prefix ?? "v" };
    }
    // type.tag is an object override
    return { prefix: type.tag.prefix ?? globalTag.prefix ?? "v", pattern: type.tag.pattern };
  }
}
