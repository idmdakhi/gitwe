import type { VersionStore } from "#gitwe/domain/ports/VersionStore";
import type { ChangelogWriter } from "#gitwe/domain/ports/ChangelogWriter";
import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import { Version } from "#gitwe/domain/valueObjects/Version";
import { type VersionBump } from "#gitwe/domain/valueObjects/VersionBump";
import type { Logger } from "#gitwe/shared/logging/Logger";
import { DomainError } from "#gitwe/domain/errors";

export interface VersionServiceOptions {
  stores: VersionStore[];
  git: GitRepository;
  changelogWriter?: ChangelogWriter;
  logger: Logger;
  requireCleanTree?: boolean;
  tagPrefix?: string;
}

export class DirtyTreeError extends DomainError {
  readonly code = "VERSION_DIRTY_TREE";
  constructor() {
    super("Working tree has uncommitted changes. Commit or stash them first.");
  }
}

export class VersionSourceMissingError extends DomainError {
  readonly code = "VERSION_SOURCE_MISSING";
  constructor() {
    super("No version found in any configured source (git tags, package.json, etc).");
  }
}

export class VersionTagExistsError extends DomainError {
  readonly code = "VERSION_TAG_EXISTS";
  constructor(public readonly tag: string) {
    super(`Tag "${tag}" already exists.`);
  }
}

export class VersionService {
  constructor(private readonly options: VersionServiceOptions) {}

  async resolveCurrent(): Promise<Version | undefined> {
    for (const store of this.options.stores) {
      const v = await store.resolveCurrent();
      if (v) return v;
    }
    return undefined;
  }

  async bump(
    kind: VersionBump,
    prereleaseId?: string,
    dryRun = false,
  ): Promise<{
    previous: Version;
    next: Version;
    tag: string;
  }> {
    if (this.options.requireCleanTree) {
      const clean = await this.options.git.isWorkingTreeClean();
      if (!clean) throw new DirtyTreeError();
    }

    const current = await this.resolveCurrent();
    if (!current) throw new VersionSourceMissingError();

    const next = current.bump(kind, prereleaseId);
    const tag = (this.options.tagPrefix ?? "v") + next.toString();

    // بررسی وجود تگ فقط در حالت غیر dry-run
    if (!dryRun) {
      try {
        const result = await this.options.git.runRaw(["rev-parse", tag]);
        if (result.stdout.trim()) {
          throw new VersionTagExistsError(tag);
        }
      } catch (error) {
        if (error instanceof VersionTagExistsError) {
          throw error;
        }
        // در غیر این صورت، تگ وجود ندارد
      }

      await Promise.all(this.options.stores.map((store) => store.write(next)));
      await this.options.git.runRaw(["tag", "-a", tag, "-m", `Release ${tag}`]);

      if (this.options.changelogWriter) {
        await this.options.changelogWriter.append({
          version: next,
          fromRef: current.toString(this.options.tagPrefix),
          toRef: "HEAD",
        });
      }
    }

    this.options.logger.info(`Bumped version: ${current.toString()} → ${next.toString()}`);
    return { previous: current, next, tag };
  }

  async tag(version: Version, message?: string): Promise<string> {
    const tagName = (this.options.tagPrefix ?? "v") + version.toString();
    await this.options.git.runRaw(["tag", "-a", tagName, "-m", message ?? `Release ${tagName}`]);
    return tagName;
  }
}
