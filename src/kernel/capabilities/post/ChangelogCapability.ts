import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { Capability } from "#gitwe/kernel/capabilities/Capability";
import type { FinishBranchCommand } from "#gitwe/application/commands/FinishBranchCommand";
import type { FinishBranchResult } from "#gitwe/application/dto/FinishBranchResult";
import type { ChangelogWriter } from "#gitwe/domain/ports/ChangelogWriter";
import { Version } from "#gitwe/domain/valueObjects/Version";

export class ChangelogCapability implements Capability<FinishBranchCommand, FinishBranchResult> {
  readonly name = "post.changelog";
  readonly description = "Append release notes to CHANGELOG.md";

  constructor(private readonly writer: ChangelogWriter) {}

  async execute(
    _input: FinishBranchCommand,
    context: PipelineContext<FinishBranchCommand, FinishBranchResult>,
  ): Promise<FinishBranchResult> {
    const versionTag = context.metadata.get("versionTag") as string | undefined;
    if (!versionTag) {
      context.logger.debug("No version tag found; skipping changelog update.");
      return context.output as FinishBranchResult;
    }

    const version = Version.parse(versionTag.replace(/^v/, ""));
    const fromRef = context.metadata.get("previousVersion") as string | undefined;
    await this.writer.append({
      version,
      fromRef,
      toRef: "HEAD",
      path: context.workflow.versioning?.changelog?.path ?? "CHANGELOG.md",
    });

    return context.output as FinishBranchResult;
  }
}
