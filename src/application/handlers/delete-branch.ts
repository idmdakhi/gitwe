import type { GitRepository } from "#gitwe/domain/ports/git-repository";
import type { Workflow } from "#gitwe/domain/aggregates/workflow";
import { RuleEvaluator } from "#gitwe/domain/services/rule-evaluator";
import type { DeleteBranchCommand } from "#gitwe/application/commands/delete-branch";
import type { DeleteBranchResult } from "#gitwe/application/dto/results";

/**
 * Use case: delete a local branch (and optionally its remote-tracking
 * counterpart). Refuses protected branches via {@link NotProtectedRule}.
 * Backs `gitwe delete <name>`.
 *
 * @public
 */
export class DeleteBranchHandler {
  constructor(
    private readonly workflow: Workflow,
    private readonly git: GitRepository,
    private readonly rules: RuleEvaluator,
  ) {}

  async handle(command: DeleteBranchCommand): Promise<DeleteBranchResult> {
    await this.rules.assertAllSatisfied({
      workflow: this.workflow,
      action: "delete",
      branchName: command.branchName,
      git: this.git,
    });

    await this.git.deleteBranch(command.branchName, command.force ?? false);

    let deletedRemote = false;
    if (command.remote) {
      await this.git.deleteRemoteBranch(this.workflow.remote.remote, command.branchName);
      deletedRemote = true;
    }

    return { branchName: command.branchName, deletedLocal: true, deletedRemote };
  }
}
