import { InvalidWorkflowDefinitionError } from "./errors";

/**
 * A branch type (e.g. feature, release, hotfix) and the rules that govern it.
 */
export interface BranchTypeRule {
  /** Name of the branch type, e.g. "feature" — used in CLI/API calls. */
  name: string;
  /** Branch name prefix, e.g. "feature/". */
  prefix: string;
  /** Branch this type must be created from, e.g. "develop". */
  baseBranch: string;
  /** Branch(es) this type is allowed to merge into when finished. */
  mergeTargets: string[];
  /** Delete the branch automatically after a successful finish(). Defaults to true. */
  deleteOnFinish?: boolean;
  /** Auto-create a tag when finishing this branch type (useful for releases). */
  autoTag?: {
    /** Prefix for the tag, e.g. "v" -> "v1.2.0". Defaults to "v". */
    prefix?: string;
    /** Pattern to extract version from branch name. Defaults to removing the branch prefix. */
    pattern?: string;
  };
}

/**
 * Hook definitions for executing custom scripts before/after operations.
 */
export interface HookDefinition {
  /** Commands to run before starting a new branch. */
  preStart?: string[];
  /** Commands to run after starting a new branch. */
  postStart?: string[];
  /** Commands to run before finishing a branch. */
  preFinish?: string[];
  /** Commands to run after finishing a branch. */
  postFinish?: string[];
}

/**
 * Remote configuration for automatic push/pull operations.
 */
export interface RemoteConfig {
  /** Remote name, defaults to "origin". */
  remote?: string;
  /** Auto-push after start/finish. */
  autoPush?: boolean;
  /** Auto-pull before start/finish. */
  autoPull?: boolean;
}

export interface WorkflowDefinition {
  /** Name of the model, for logs/errors, e.g. "git-flow". */
  name: string;
  /** Branch type rules. */
  branchTypes: BranchTypeRule[];
  /** Optional hooks for custom scripts. */
  hooks?: HookDefinition;
  /** Optional remote configuration. */
  remote?: RemoteConfig;
}

/**
 * Validates structural invariants of a WorkflowDefinition that would
 * otherwise fail confusingly deep inside WorkflowEngine (or silently
 * produce wrong behavior). Call this once when a definition is loaded
 * — e.g. from a config file supplied by the user.
 */
export function validateWorkflowDefinition(def: WorkflowDefinition): void {
  if (def.branchTypes.length === 0) {
    throw new InvalidWorkflowDefinitionError("must define at least one branch type");
  }

  const seenNames = new Set<string>();
  const seenPrefixes = new Set<string>();

  for (const rule of def.branchTypes) {
    if (!rule.name.trim()) {
      throw new InvalidWorkflowDefinitionError("branch type name cannot be empty");
    }
    if (seenNames.has(rule.name)) {
      throw new InvalidWorkflowDefinitionError(`duplicate branch type name "${rule.name}"`);
    }
    seenNames.add(rule.name);

    if (!rule.prefix.trim()) {
      throw new InvalidWorkflowDefinitionError(`branch type "${rule.name}" has an empty prefix`);
    }
    if (seenPrefixes.has(rule.prefix)) {
      throw new InvalidWorkflowDefinitionError(`duplicate branch prefix "${rule.prefix}"`);
    }
    seenPrefixes.add(rule.prefix);

    if (!rule.baseBranch.trim()) {
      throw new InvalidWorkflowDefinitionError(
        `branch type "${rule.name}" has an empty baseBranch`,
      );
    }
    if (rule.mergeTargets.length === 0) {
      throw new InvalidWorkflowDefinitionError(
        `branch type "${rule.name}" must declare at least one merge target`,
      );
    }

    // Validate autoTag if present
    if (rule.autoTag) {
      if (rule.autoTag.prefix !== undefined && typeof rule.autoTag.prefix !== "string") {
        throw new InvalidWorkflowDefinitionError(
          `branch type "${rule.name}" has invalid autoTag.prefix (must be a string)`,
        );
      }
      if (rule.autoTag.pattern !== undefined && typeof rule.autoTag.pattern !== "string") {
        throw new InvalidWorkflowDefinitionError(
          `branch type "${rule.name}" has invalid autoTag.pattern (must be a string)`,
        );
      }
    }
  }

  // Validate hooks if present
  if (def.hooks) {
    const hookKeys = ["preStart", "postStart", "preFinish", "postFinish"] as const;
    for (const key of hookKeys) {
      const commands = def.hooks[key];
      if (commands !== undefined) {
        if (!Array.isArray(commands)) {
          throw new InvalidWorkflowDefinitionError(`hooks.${key} must be an array of strings`);
        }
        if (!commands.every((cmd) => typeof cmd === "string")) {
          throw new InvalidWorkflowDefinitionError(`hooks.${key} must contain only strings`);
        }
      }
    }
  }

  // Validate remote config if present
  if (def.remote) {
    if (def.remote.remote !== undefined && typeof def.remote.remote !== "string") {
      throw new InvalidWorkflowDefinitionError("remote.remote must be a string");
    }
    if (def.remote.autoPush !== undefined && typeof def.remote.autoPush !== "boolean") {
      throw new InvalidWorkflowDefinitionError("remote.autoPush must be a boolean");
    }
    if (def.remote.autoPull !== undefined && typeof def.remote.autoPull !== "boolean") {
      throw new InvalidWorkflowDefinitionError("remote.autoPull must be a boolean");
    }
  }
}

/**
 * Default implementation of classic git-flow.
 * Consumers can build their own WorkflowDefinition and inject it
 * instead — nothing in WorkflowEngine is hardcoded against this.
 */
export const gitFlowDefinition: WorkflowDefinition = {
  name: "git-flow",
  branchTypes: [
    {
      name: "feature",
      prefix: "feature/",
      baseBranch: "develop",
      mergeTargets: ["develop"],
      deleteOnFinish: true,
    },
    {
      name: "release",
      prefix: "release/",
      baseBranch: "develop",
      mergeTargets: ["main", "develop"],
      deleteOnFinish: true,
      autoTag: {
        prefix: "v",
      },
    },
    {
      name: "hotfix",
      prefix: "hotfix/",
      baseBranch: "main",
      mergeTargets: ["main", "develop"],
      deleteOnFinish: true,
    },
  ],
  remote: {
    remote: "origin",
    autoPush: false,
    autoPull: false,
  },
};
