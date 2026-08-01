import type { GitRepository } from "#gitwe/domain/ports/git-repository";
import type { Workflow } from "#gitwe/domain/aggregates/workflow";
import { RuleEvaluator } from "#gitwe/domain/services/rule-evaluator";
import type { RenameBranchCommand } from "#gitwe/application/commands/rename-branch";
import type { RenameBranchResult } from "#gitwe/application/dto/results";

/**
 * Use case: rename a local branch. Refuses protected branches via
 * {@link NotProtectedRule}. Backs `gitwe rename <old> <new>`.
 *
 * @public
 */
export class RenameBranchHandler {
  constructor(
    private readonly workflow: Workflow,
    private readonly git: GitRepository,
    private readonly rules: RuleEvaluator,
  ) {}

  async handle(command: RenameBranchCommand): Promise<RenameBranchResult> {
    await this.rules.assertAllSatisfied({
      workflow: this.workflow,
      action: "rename",
      branchName: command.oldName,
      git: this.git,
    });

    await this.git.renameBranch(command.oldName, command.newName);

    return { oldName: command.oldName, newName: command.newName };
  }
}
