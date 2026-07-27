import type { ConditionalCapability } from "#gitwe/kernel/capabilities/Capability";
import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { FinishBranchCommand } from "#gitwe/application/commands/FinishBranchCommand";
import type { FinishBranchResult } from "#gitwe/application/dto/FinishBranchResult";
import { AutoTagPolicy } from "#gitwe/domain/policies/AutoTagPolicy";
import type { TagService } from "#gitwe/application/services/TagService";

export class TagCapability implements ConditionalCapability<
  FinishBranchCommand,
  FinishBranchResult
> {
  readonly name = "post.tag";
  readonly description = "Create git tag for finished branch";

  constructor(private readonly tagService: TagService) {}

  isEnabled(
    input: FinishBranchCommand,
    context: PipelineContext<FinishBranchCommand, FinishBranchResult>,
  ): boolean {
    const rule = context.workflow.findRuleForBranch(input.branchName);
    return !!rule?.autoTag && !(input.dryRun ?? false);
  }

  async execute(
    input: FinishBranchCommand,
    context: PipelineContext<FinishBranchCommand, FinishBranchResult>,
  ): Promise<FinishBranchResult> {
    const rule = context.workflow.findRuleForBranch(input.branchName);
    if (!rule) throw new Error(`No rule found for branch: ${input.branchName}`);

    const tagName = AutoTagPolicy.tagNameFor(rule, input.branchName);
    if (!tagName) return context.output as FinishBranchResult;

    const versionTag = context.metadata.get("versionTag") as string | undefined;
    const finalTag = versionTag ?? tagName;

    // ایجاد تگ
    await this.tagService.createTag(finalTag, `Release ${finalTag}`);

    // ذخیره در metadata
    const createdTags = (context.metadata.get("createdTags") as string[]) || [];
    createdTags.push(finalTag);
    context.metadata.set("createdTags", createdTags);

    // به‌روزرسانی output با استفاده از spread
    const currentOutput = context.output as FinishBranchResult;
    if (currentOutput) {
      context.output = {
        ...currentOutput,
        tags: [...(currentOutput.tags || []), finalTag],
      };
    }

    return context.output as FinishBranchResult;
  }
}
