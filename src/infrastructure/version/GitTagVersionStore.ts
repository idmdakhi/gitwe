import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { VersionStore } from "#gitwe/domain/ports/VersionStore";
import { Version } from "#gitwe/domain/valueObjects/Version";

export class GitTagVersionStore implements VersionStore {
  constructor(
    private readonly git: GitRepository,
    private readonly prefix: string = "v",
  ) {}

  async resolveCurrent(): Promise<Version | undefined> {
    try {
      const result = await this.git.runRaw(["tag", "--list", `${this.prefix}*`]);
      const tags = result.stdout.split("\n").filter(Boolean);
      if (tags.length === 0) return undefined;

      const versions = tags
        .map((tag) => {
          try {
            return Version.parse(tag);
          } catch {
            return null;
          }
        })
        .filter((v): v is Version => v !== null);

      if (versions.length === 0) return undefined;

      // Return the highest version
      return versions.reduce((a, b) => (a.compare(b) === 1 ? a : b));
    } catch {
      return undefined;
    }
  }

  async write(version: Version): Promise<void> {
    const tagName = version.toString(this.prefix);
    await this.git.runRaw(["tag", "-a", tagName, "-m", `Release ${tagName}`]);
  }
}
