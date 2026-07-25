import { BranchTypeRule } from "#gitwe/domain/valueObjects/BranchTypeRule";
import { HookDefinition } from "#gitwe/domain/hooks/HookDefinition";
import { RemoteConfig } from "#gitwe/domain/valueObjects/RemoteConfig";
import { BranchNamingPolicy } from "#gitwe/domain/valueObjects/BranchNamingPolicy";
import { ConventionalCommitPolicy } from "#gitwe/domain/policies/ConventionalCommitPolicy";
import type { MergeStrategy } from "#gitwe/domain/valueObjects/MergeStrategy";
import { InvalidWorkflowDefinitionError } from "#gitwe/domain/errors";

/**
 * The `Workflow` aggregate root. It owns and enforces every invariant a
 * branching strategy must satisfy — unique names, unique prefixes, at
 * least one merge target, etc — so nothing downstream (application
 * services, CLI) has to re-check them.
 *
 * `gitwe` treats "git-flow" as just one possible `Workflow` instance, not
 * something baked into the engine — see `infrastructure/config/BuiltInWorkflows.ts`
 * for git-flow, GitHub Flow, and trunk-based examples, or load a custom one
 * from JSON/YAML via `WorkflowConfigLoader`.
 */
export class Workflow {
  private constructor(
    public readonly name: string,
    public readonly branchTypes: readonly BranchTypeRule[],
    public readonly hooks: HookDefinition,
    public readonly remote: RemoteConfig,
    public readonly protectedBranches: ReadonlySet<string>,
    public readonly branchNaming: BranchNamingPolicy,
    public readonly mergeStrategy: MergeStrategy,
    public readonly commitPolicy: ConventionalCommitPolicy,
  ) {}

  static create(props: {
    name: string;
    branchTypes: BranchTypeRule[];
    hooks?: HookDefinition;
    remote?: RemoteConfig;
    protectedBranches?: string[];
    branchNaming?: BranchNamingPolicy;
    mergeStrategy?: MergeStrategy;
    commitPolicy?: ConventionalCommitPolicy;
  }): Workflow {
    Workflow.assertValid(props.name, props.branchTypes);
    return new Workflow(
      props.name,
      props.branchTypes,
      props.hooks ?? HookDefinition.empty(),
      props.remote ?? RemoteConfig.create(),
      new Set(props.protectedBranches ?? []),
      props.branchNaming ?? BranchNamingPolicy.create(),
      props.mergeStrategy ?? "merge",
      props.commitPolicy ?? ConventionalCommitPolicy.create(),
    );
  }

  private static assertValid(name: string, branchTypes: readonly BranchTypeRule[]): void {
    if (!name.trim()) {
      throw new InvalidWorkflowDefinitionError("workflow name cannot be empty");
    }
    if (branchTypes.length === 0) {
      throw new InvalidWorkflowDefinitionError("must define at least one branch type");
    }

    const seenNames = new Set<string>();
    const seenPrefixes = new Set<string>();

    for (const rule of branchTypes) {
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

  /** Finds the branch-type rule registered under this exact type name (e.g. "feature"). */
  findBranchType(typeName: string): BranchTypeRule | undefined {
    return this.branchTypes.find((rule) => rule.name === typeName);
  }

  /** Finds the branch-type rule whose prefix matches a full branch name (e.g. "feature/login"). */
  findRuleForBranch(fullBranchName: string): BranchTypeRule | undefined {
    return this.branchTypes.find((rule) => rule.matches(fullBranchName));
  }

  listBranchTypeNames(): string[] {
    return this.branchTypes.map((t) => t.name);
  }

  isProtected(branchName: string): boolean {
    return this.protectedBranches.has(branchName);
  }
}
