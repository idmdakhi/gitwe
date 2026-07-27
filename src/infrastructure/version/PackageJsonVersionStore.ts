import { readFile, writeFile } from "node:fs/promises";
import type { VersionStore } from "#gitwe/domain/ports/VersionStore";
import { Version } from "#gitwe/domain/valueObjects/Version";

export class PackageJsonVersionStore implements VersionStore {
  constructor(private readonly filePath: string = "package.json") {}

  async resolveCurrent(): Promise<Version | undefined> {
    try {
      const content = await readFile(this.filePath, "utf-8");
      const pkg = JSON.parse(content);
      if (!pkg.version) return undefined;
      return Version.parse(pkg.version);
    } catch {
      return undefined;
    }
  }

  async write(version: Version): Promise<void> {
    const content = await readFile(this.filePath, "utf-8");
    const pkg = JSON.parse(content);
    pkg.version = version.toString();
    await writeFile(this.filePath, JSON.stringify(pkg, null, 2) + "\n");
  }
}
