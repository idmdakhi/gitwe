import type { VersionStore } from "#gitwe/domain/ports/VersionStore";
import { Version } from "#gitwe/domain/valueObjects/Version";

export class CompositeVersionStore implements VersionStore {
  constructor(
    private readonly stores: VersionStore[],
    private readonly primary: "highest" | "first" = "highest",
  ) {}

  async resolveCurrent(): Promise<Version | undefined> {
    const results: Version[] = [];
    for (const store of this.stores) {
      const v = await store.resolveCurrent();
      if (v) results.push(v);
    }
    if (results.length === 0) return undefined;

    if (this.primary === "highest") {
      return results.reduce((a, b) => (a.compare(b) === 1 ? a : b));
    }
    return results[0];
  }

  async write(version: Version): Promise<void> {
    await Promise.all(this.stores.map((store) => store.write(version)));
  }
}
