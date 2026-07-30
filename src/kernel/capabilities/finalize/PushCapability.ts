import type { ConditionalCapability } from "#gitwe/kernel/capabilities/Capability";
import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { FinishBranchCommand } from "#gitwe/application/commands/FinishBranchCommand";
import type { FinishBranchResult } from "#gitwe/application/dto/FinishBranchResult";

export class PushCapability implements ConditionalCapability<
  FinishBranchCommand,
  FinishBranchResult
> {
  readonly name = "finalize.push";
  readonly description = "Push changes to remote repository";

  constructor(private readonly git: GitRepository) {}

  isEnabled(
    input: FinishBranchCommand,
    context: PipelineContext<FinishBranchCommand, FinishBranchResult>,
  ): boolean {
    const remote = context.workflow.remote;
    return (remote.autoPush || (input.pushAfterFinish ?? false)) && !(input.dryRun ?? false);
  }

  async execute(
    input: FinishBranchCommand,
    context: PipelineContext<FinishBranchCommand, FinishBranchResult>,
  ): Promise<FinishBranchResult> {
    const remote = context.workflow.remote;
    const branchName = input.branchName;

    await this.git.push(remote.remote, branchName);

    // Push tags if any were created
    const tags = (context.metadata.get("createdTags") as string[]) || [];
    for (const tag of tags) {
      await this.git.runRaw(["push", remote.remote, tag]);
    }

    context.metadata.set("pushed", true);

    return context.output as FinishBranchResult;
  }
}
