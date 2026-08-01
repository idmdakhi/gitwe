import type { GitRepository } from "#gitwe/domain/ports/git-repository";
import type { Workflow } from "#gitwe/domain/aggregates/workflow";
import { BranchResolver } from "#gitwe/application/services/branch-resolver";
import { BranchNotFoundError } from "#gitwe/domain/errors/index";
import type { CheckoutBranchCommand } from "#gitwe/application/commands/checkout-branch";
import type { CheckoutBranchResult } from "#gitwe/application/dto/results";

/**
 * Use case: check out a branch by exact or partial name, matching local
 * branches first and falling back to creating a local tracking branch
 * from a matching remote branch (like `git checkout <branch>` itself
 * does for an unambiguous remote match). Backs `gitwe checkout <query>`.
 *
 * @public
 */
export class CheckoutBranchHandler {
  constructor(
    private readonly workflow: Workflow,
    private readonly git: GitRepository,
    private readonly resolver: BranchResolver,
  ) {}

  async handle(command: CheckoutBranchCommand): Promise<CheckoutBranchResult> {
    const localMatch = await this.resolver.resolveLocalMatch(command.query);
    if (localMatch) {
      await this.git.checkout(localMatch);
      return { branchName: localMatch, createdTrackingBranch: false };
    }

    const remote = this.workflow.remote.remote;
    try {
      const remoteMatch = await this.resolver.resolveRemoteMatch(command.query, remote);
      await this.git.createTrackingBranch(remoteMatch, remote);
      return { branchName: remoteMatch, createdTrackingBranch: true };
    } catch {
      throw new BranchNotFoundError(command.query);
    }
  }
}
