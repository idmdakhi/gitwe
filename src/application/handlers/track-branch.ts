import type { GitRepository } from "#gitwe/domain/ports/git-repository";
import type { Workflow } from "#gitwe/domain/aggregates/workflow";
import { BranchResolver } from "#gitwe/application/services/branch-resolver";
import type { TrackBranchCommand } from "#gitwe/application/commands/track-branch";
import type { TrackBranchResult } from "#gitwe/application/dto/results";

/**
 * Use case: create a local branch tracking an existing remote branch, for
 * picking up a topic branch a teammate has already published. Backs
 * `gitwe track <name>`.
 *
 * @public
 */
export class TrackBranchHandler {
  constructor(
    private readonly workflow: Workflow,
    private readonly git: GitRepository,
    private readonly resolver: BranchResolver,
  ) {}

  async handle(command: TrackBranchCommand): Promise<TrackBranchResult> {
    const remote = this.workflow.remote.remote;
    const branchName = await this.resolver.resolveRemoteMatch(command.branchName, remote);

    await this.git.createTrackingBranch(branchName, remote);

    return { branchName, remote };
  }
}
