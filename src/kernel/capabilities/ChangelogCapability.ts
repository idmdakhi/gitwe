import type { Capability, WorkflowContext } from "../Capability";
import type { ChangelogWriter } from "#gitwe/domain/ports/ChangelogWriter";
import type { Version } from "#gitwe/domain/valueObjects/Version";

export interface ChangelogInput {
  version: Version;
  fromRef?: string;
  toRef?: string;
  path?: string;
}

export interface ChangelogOutput {
  path: string;
  entries: number;
}

export class ChangelogCapability implements Capability<ChangelogInput, ChangelogOutput> {
  readonly name = "changelog";
  readonly description = "Append release notes to CHANGELOG.md";

  constructor(private readonly writer: ChangelogWriter) {}

  async execute(input: ChangelogInput, ctx: WorkflowContext): Promise<ChangelogOutput> {
    const path = await this.writer.append({
      version: input.version,
      fromRef: input.fromRef,
      toRef: input.toRef ?? "HEAD",
      path: input.path ?? "CHANGELOG.md",
    });

    ctx.logger.info(`Changelog updated: ${path}`);

    // Rough count of entries for the output
    const entries = 1; // Could be improved by counting commits

    return { path, entries };
  }
}
