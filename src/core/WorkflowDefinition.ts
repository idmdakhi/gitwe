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
}

export interface WorkflowDefinition {
  /** Name of the model, for logs/errors, e.g. "git-flow". */
  name: string;
  branchTypes: BranchTypeRule[];
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
    },
    {
      name: "hotfix",
      prefix: "hotfix/",
      baseBranch: "main",
      mergeTargets: ["main", "develop"],
      deleteOnFinish: true,
    },
  ],
};
