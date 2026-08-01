import type { GitRepository } from "#gitwe/domain/ports/git-repository";
import type { Workflow } from "#gitwe/domain/aggregates/workflow";
import { RuleEvaluator } from "#gitwe/domain/services/rule-evaluator";
import { UnrecognizedBranchError } from "#gitwe/domain/errors/index";
import type { UpdateBranchCommand } from "#gitwe/application/commands/update-branch";
import type { UpdateBranchResult } from "#gitwe/application/dto/results";

/**
 * Use case: bring a topic branch up to date with its parent base branch,
 * by merging the parent in or rebasing onto it. Backs
 * `gitwe <type> update <name>` / `gitwe update` (on the current branch).
 *
 * @public
 */
export class UpdateBranchHandler {
  constructor(
    private readonly workflow: Workflow,
    private readonly git: GitRepository,
    private readonly rules: RuleEvaluator,
  ) {}

  async handle(command: UpdateBranchCommand): Promise<UpdateBranchResult> {
    const rule = this.workflow.findRuleForBranch(command.branchName);
    if (!rule) throw new UnrecognizedBranchError(command.branchName);

    await this.rules.assertAllSatisfied({
      workflow: this.workflow,
      action: "update",
      branchName: command.branchName,
      git: this.git,
    });

    const base = this.workflow.findBaseBranch(rule.parent);
    const strategy = command.strategy ?? base?.downstreamStrategy ?? "merge";

    if (strategy === "rebase") {
      await this.git.rebase(command.branchName, rule.parent);
      return { branchName: command.branchName, parent: rule.parent, strategy };
    }

    const outcome = await this.git.merge(rule.parent, command.branchName, { strategy: "merge" });
    return {
      branchName: command.branchName,
      parent: rule.parent,
      strategy,
      fastForward: outcome.fastForward,
    };
  }
}
