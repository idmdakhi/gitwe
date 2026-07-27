import type { Capability, WorkflowContext } from "../Capability";
import type { VersionService } from "#gitwe/application/services/VersionService";
import type { VersionBump } from "#gitwe/domain/valueObjects/VersionBump";

export interface VersionInput {
  action: "resolve" | "bump";
  bumpKind?: VersionBump;
  prereleaseId?: string;
  dryRun?: boolean;
}

export interface VersionOutput {
  previous?: string;
  current?: string;
  next?: string;
  tag?: string;
  source: string;
}

export class VersionCapability implements Capability<VersionInput, VersionOutput> {
  readonly name = "version";
  readonly description = "Resolve and bump semantic versions";

  constructor(private readonly service: VersionService) {}

  async execute(input: VersionInput, ctx: WorkflowContext): Promise<VersionOutput> {
    ctx.logger.debug(`VersionCapability: ${input.action}`);

    if (input.action === "resolve") {
      const version = await this.service.resolveCurrent();
      return {
        current: version?.toString(),
        source: "auto",
      };
    }

    if (input.action === "bump") {
      if (!input.bumpKind) {
        throw new Error("bumpKind is required for action 'bump'");
      }
      const result = await this.service.bump(
        input.bumpKind,
        input.prereleaseId,
        input.dryRun ?? false,
      );
      return {
        previous: result.previous.toString(),
        next: result.next.toString(),
        tag: result.tag,
        source: "auto",
      };
    }

    throw new Error(`Unknown version action: ${input.action}`);
  }
}
