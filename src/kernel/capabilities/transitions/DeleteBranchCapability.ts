import type { ConditionalCapability } from "#gitwe/kernel/capabilities/Capability";
import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { FinishBranchCommand } from "#gitwe/application/commands/FinishBranchCommand";
import type { FinishBranchResult } from "#gitwe/application/dto/FinishBranchResult";
import type { GitRepository } from "#gitwe/domain/ports/GitRepository";

export class DeleteBranchCapability implements ConditionalCapability<
  FinishBranchCommand,
  FinishBranchResult
> {
  readonly name = "transition.delete-branch";
  readonly description = "Delete branch after merging";

  constructor(private readonly git: GitRepository) {}

  isEnabled(
    input: FinishBranchCommand,
    context: PipelineContext<FinishBranchCommand, FinishBranchResult>,
  ): boolean {
    const rule = context.workflow.findRuleForBranch(input.branchName);
    if (!rule) return false;
    const willDelete = (input.deleteAfterMerge ?? true) && rule.deleteOnFinish;
    return willDelete && !(input.dryRun ?? false);
  }

  async execute(
    input: FinishBranchCommand,
    context: PipelineContext<FinishBranchCommand, FinishBranchResult>,
  ): Promise<FinishBranchResult> {
    const rule = context.workflow.findRuleForBranch(input.branchName);
    if (!rule) throw new Error(`No rule found for branch: ${input.branchName}`);

    const strategy = context.metadata.get("resolvedStrategy") as string | undefined;
    const force = strategy === "squash";

    await this.git.deleteBranch(input.branchName, force);

    // به‌روزرسانی output
    const currentOutput = context.output as FinishBranchResult;
    if (currentOutput) {
      context.output = {
        ...currentOutput,
        deleted: true,
      };
    }
    context.metadata.set("deleted", true);

    return context.output as FinishBranchResult;
  }
}
