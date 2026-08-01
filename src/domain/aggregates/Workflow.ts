import { BranchTypeRule } from "#gitwe/domain/valueObjects/branch-type-rule";
import { BaseBranchRule } from "#gitwe/domain/valueObjects/base-branch-rule";
import { RemoteConfig } from "#gitwe/domain/valueObjects/remote-config";
import { BranchNamingPolicy } from "#gitwe/domain/valueObjects/branch-naming-policy";
import { InvalidWorkflowDefinitionError } from "#gitwe/domain/errors/index";

/**
 * The `Workflow` aggregate root: a complete, named branching strategy made
 * of two kinds of branches —
 *
 * - **base branches** ({@link BaseBranchRule}): long-lived branches like
 *   `main` or `develop`, optionally forming a parent/child hierarchy for
 *   automatic downstream syncing;
 * - **topic branches** ({@link BranchTypeRule}): short-lived branches like
 *   `feature`, `release`, or `hotfix`, each merging into one base branch
 *   when finished.
 *
 * `gitwe` does not hardcode "Gitflow" or any other strategy — it is just
 * one possible `Workflow` instance. See
 * `infrastructure/config/built-in-workflows.ts` for ready-made presets
 * (classic Gitflow, GitHub Flow, GitLab Flow), or define a fully custom
 * one and load it via `WorkflowConfigStore`.
 *
 * As an aggregate root, `Workflow` owns and enforces every structural
 * invariant a branching strategy must satisfy (unique names/prefixes,
 * every topic type pointing at a real base branch, etc.) so nothing
 * downstream has to re-check them. Construct instances via
 * {@link Workflow.create} — there is no public constructor.
 *
 * @public
 */
export class Workflow {
  private constructor(
    public readonly name: string,
    public readonly baseBranches: readonly BaseBranchRule[],
    public readonly branchTypes: readonly BranchTypeRule[],
    public readonly remote: RemoteConfig,
    public readonly protectedBranches: ReadonlySet<string>,
    public readonly branchNaming: BranchNamingPolicy,
  ) {}

  /**
   * Builds and validates a `Workflow`.
   *
   * @throws {InvalidWorkflowDefinitionError} If the definition violates a structural invariant — see {@link Workflow.assertValid}.
   */
  static create(props: {
    name: string;
    baseBranches: BaseBranchRule[];
    branchTypes: BranchTypeRule[];
    remote?: RemoteConfig;
    protectedBranches?: string[];
    branchNaming?: BranchNamingPolicy;
  }): Workflow {
    Workflow.assertValid(props.name, props.baseBranches, props.branchTypes);

    const protectedSet = new Set([
      ...props.baseBranches.map((b) => b.name),
      ...(props.protectedBranches ?? []),
    ]);

    return new Workflow(
      props.name,
      props.baseBranches,
      props.branchTypes,
      props.remote ?? RemoteConfig.create(),
      protectedSet,
      props.branchNaming ?? BranchNamingPolicy.create(),
    );
  }

  /**
   * Enforces this aggregate's structural invariants:
   * - a non-empty name;
   * - at least one base branch, with unique, non-empty names;
   * - every base branch's `parent` (if set) refers to another declared base branch;
   * - at least one topic branch type, with unique, non-empty names and prefixes;
   * - every topic type's `parent` and `startingPoint` refer to declared base branches.
   *
   * All base branches are implicitly protected — see {@link Workflow.create}.
   *
   * @throws {InvalidWorkflowDefinitionError} On the first invariant violation found.
   */
  private static assertValid(
    name: string,
    baseBranches: readonly BaseBranchRule[],
    branchTypes: readonly BranchTypeRule[],
  ): void {
    if (!name.trim()) {
      throw new InvalidWorkflowDefinitionError("workflow name cannot be empty");
    }
    if (baseBranches.length === 0) {
      throw new InvalidWorkflowDefinitionError("must define at least one base branch");
    }

    const baseNames = new Set<string>();
    for (const base of baseBranches) {
      if (!base.name.trim()) {
        throw new InvalidWorkflowDefinitionError("base branch name cannot be empty");
      }
      if (baseNames.has(base.name)) {
        throw new InvalidWorkflowDefinitionError(`duplicate base branch name "${base.name}"`);
      }
      baseNames.add(base.name);
    }
    for (const base of baseBranches) {
      if (base.parent !== undefined && !baseNames.has(base.parent)) {
        throw new InvalidWorkflowDefinitionError(
          `base branch "${base.name}" has unknown parent "${base.parent}"`,
        );
      }
    }

    if (branchTypes.length === 0) {
      throw new InvalidWorkflowDefinitionError("must define at least one branch type");
    }

    const typeNames = new Set<string>();
    const prefixes = new Set<string>();
    for (const type of branchTypes) {
      if (!type.name.trim()) {
        throw new InvalidWorkflowDefinitionError("branch type name cannot be empty");
      }
      if (typeNames.has(type.name)) {
        throw new InvalidWorkflowDefinitionError(`duplicate branch type name "${type.name}"`);
      }
      typeNames.add(type.name);

      if (!type.prefix.trim()) {
        throw new InvalidWorkflowDefinitionError(`branch type "${type.name}" has an empty prefix`);
      }
      if (prefixes.has(type.prefix)) {
        throw new InvalidWorkflowDefinitionError(`duplicate branch prefix "${type.prefix}"`);
      }
      prefixes.add(type.prefix);

      if (!baseNames.has(type.parent)) {
        throw new InvalidWorkflowDefinitionError(
          `branch type "${type.name}" has unknown parent base branch "${type.parent}"`,
        );
      }
      if (!baseNames.has(type.startingPoint)) {
        throw new InvalidWorkflowDefinitionError(
          `branch type "${type.name}" has unknown startingPoint base branch "${type.startingPoint}"`,
        );
      }
    }
  }

  /** Finds the topic-branch-type rule registered under this exact type name (e.g. `"feature"`). */
  findBranchType(typeName: string): BranchTypeRule | undefined {
    return this.branchTypes.find((t) => t.name === typeName);
  }

  /** Finds the topic-branch-type rule whose prefix matches a full branch name (e.g. `"feature/login"`). */
  findRuleForBranch(fullBranchName: string): BranchTypeRule | undefined {
    return this.branchTypes.find((t) => t.matches(fullBranchName));
  }

  /** Finds a base branch by name. */
  findBaseBranch(name: string): BaseBranchRule | undefined {
    return this.baseBranches.find((b) => b.name === name);
  }

  /** Lists every base branch that declares `parentName` as its parent and has `autoUpdate` enabled. */
  autoUpdateChildrenOf(parentName: string): BaseBranchRule[] {
    return this.baseBranches.filter((b) => b.parent === parentName && b.autoUpdate);
  }

  /** Lists every registered branch type name, in declaration order. */
  listBranchTypeNames(): string[] {
    return this.branchTypes.map((t) => t.name);
  }

  /** Whether `branchName` is protected (every base branch is implicitly protected). */
  isProtected(branchName: string): boolean {
    return this.protectedBranches.has(branchName);
  }
}
