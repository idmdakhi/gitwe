import type { ConditionalCapability } from "#gitwe/kernel/capabilities/Capability";
import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { FinishBranchCommand } from "#gitwe/application/commands/FinishBranchCommand";
import type { FinishBranchResult } from "#gitwe/application/dto/FinishBranchResult";
import type { VersionService } from "#gitwe/application/services/VersionService";

export class VersionBumpCapability implements ConditionalCapability<
  FinishBranchCommand,
  FinishBranchResult
> {
  readonly name = "post.version-bump";
  readonly description = "Bump semantic version for finished branch";

  constructor(private readonly versionService: VersionService) {}

  isEnabled(
    input: FinishBranchCommand,
    context: PipelineContext<FinishBranchCommand, FinishBranchResult>,
  ): boolean {
    const rule = context.workflow.findRuleForBranch(input.branchName);
    if (!rule) return false;
    return !!rule.bumpVersion && rule.bumpVersion !== "none" && !input.dryRun;
  }

  async execute(
    input: FinishBranchCommand,
    context: PipelineContext<FinishBranchCommand, FinishBranchResult>,
  ): Promise<FinishBranchResult> {
    const rule = context.workflow.findRuleForBranch(input.branchName);
    if (!rule) throw new Error(`No rule found for branch: ${input.branchName}`);

    const result = await this.versionService.bump(
      rule.bumpVersion!,
      undefined,
      input.dryRun ?? false,
    );

    context.metadata.set("bumpedVersion", result.next.toString());
    context.metadata.set("versionTag", result.tag);
    context.metadata.set("previousVersion", result.previous.toString());

    return context.output as FinishBranchResult;
  }
}
