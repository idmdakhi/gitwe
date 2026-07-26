import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import { Workflow } from "#gitwe/domain/aggregates/Workflow";
import { BranchName } from "#gitwe/domain/valueObjects/BranchName";
import { RuleEvaluator } from "#gitwe/domain/services/RuleEvaluator";
import { UnknownBranchTypeError } from "#gitwe/domain/errors";
import { BranchTypeRule } from "#gitwe/domain/valueObjects/BranchTypeRule";

/** Orchestrates creating a new branch of a given type, after rule validation. */
export class BranchService {
  constructor(
    private readonly git: GitRepository,
    private readonly ruleEvaluator: RuleEvaluator,
  ) {}

  /** Resolves the rule for a branch type, or throws `UnknownBranchTypeError`. */
  resolveBranchType(workflow: Workflow, typeName: string): BranchTypeRule {
    const rule = workflow.findBranchType(typeName);
    if (!rule) throw new UnknownBranchTypeError(typeName, workflow.listBranchTypeNames());
    return rule;
  }

  async create(workflow: Workflow, rule: BranchTypeRule, shortName: string): Promise<string> {
    const fullName = BranchName.fromShortName(shortName).withPrefix(rule.prefix).toString();

    await this.ruleEvaluator.assertAllSatisfied({
      workflow,
      action: "start",
      branchName: fullName,
      baseBranch: rule.baseBranch,
      git: this.git,
    });

    await this.git.createBranch(fullName, { from: rule.baseBranch, checkout: true });
    return fullName;
  }
}
