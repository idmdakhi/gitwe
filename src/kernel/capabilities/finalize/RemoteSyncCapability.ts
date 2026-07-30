import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { ConditionalCapability } from "#gitwe/kernel/capabilities/Capability";
import type { FinishBranchCommand } from "#gitwe/application/commands/FinishBranchCommand";
import type { FinishBranchResult } from "#gitwe/application/dto/FinishBranchResult";
import type { GitRepository } from "#gitwe/domain/ports/GitRepository";

export class RemoteSyncCapability implements ConditionalCapability<
  FinishBranchCommand,
  FinishBranchResult
> {
  readonly name = "finalize.remote-sync";
  readonly description = "Sync with remote (pull before finish, push after)";

  constructor(private readonly git: GitRepository) {}

  isEnabled(
    input: FinishBranchCommand,
    context: PipelineContext<FinishBranchCommand, FinishBranchResult>,
  ): boolean {
    const remote = context.workflow.remote;
    return (remote.autoPull || remote.autoPush) && !input.dryRun;
  }

  async execute(
    input: FinishBranchCommand,
    context: PipelineContext<FinishBranchCommand, FinishBranchResult>,
  ): Promise<FinishBranchResult> {
    const remote = context.workflow.remote;
    if (remote.autoPull) {
      await this.git.pull(remote.remote, input.branchName);
    }
    if (remote.autoPush) {
      await this.git.push(remote.remote, input.branchName);
    }
    return context.output as FinishBranchResult;
  }
}
