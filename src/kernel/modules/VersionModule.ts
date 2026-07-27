import type { KernelModule } from "#gitwe/kernel/KernelModule";
import type { VersionService } from "#gitwe/application/services/VersionService";
import type { VersionBump } from "#gitwe/domain/valueObjects/VersionBump";

export interface VersionShowInput {
  // empty
}

export interface VersionShowOutput {
  version: string;
  source: string;
  isPrerelease: boolean;
  tagPrefix: string;
}

export interface VersionBumpInput {
  kind: VersionBump;
  prereleaseId?: string;
  dryRun?: boolean;
}

export interface VersionBumpOutput {
  previous: string;
  next: string;
  tag: string;
  dryRun: boolean;
  changelogPath?: string;
}

export class VersionShowModule implements KernelModule<VersionShowInput, VersionShowOutput> {
  readonly name = "version:show";
  readonly description = "Show current version";

  constructor(
    private readonly service: VersionService,
    private readonly tagPrefix: string = "v",
  ) {}

  async execute(_input: VersionShowInput): Promise<VersionShowOutput> {
    const version = await this.service.resolveCurrent();
    return {
      version: version?.toString() ?? "0.0.0 (none found)",
      source: "auto",
      isPrerelease: version?.isPrerelease() ?? false,
      tagPrefix: this.tagPrefix,
    };
  }
}

export class VersionBumpModule implements KernelModule<VersionBumpInput, VersionBumpOutput> {
  readonly name = "version:bump";
  readonly description = "Bump version and optionally tag/changelog";

  constructor(private readonly service: VersionService) {}

  async execute(input: VersionBumpInput): Promise<VersionBumpOutput> {
    const result = await this.service.bump(input.kind, input.prereleaseId, input.dryRun ?? false);
    return {
      previous: result.previous.toString(),
      next: result.next.toString(),
      tag: result.tag,
      dryRun: input.dryRun ?? false,
      changelogPath: "CHANGELOG.md", // Could be configurable
    };
  }
}
