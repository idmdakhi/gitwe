import { Version } from "#gitwe/domain/valueObjects/Version";

export interface VersionStore {
  /** Resolve the highest known version from the source. */
  resolveCurrent(): Promise<Version | undefined>;
  /** Persist the given version to the source. */
  write(version: Version): Promise<void>;
}

export interface VersionStoreFactory {
  create(source: "git-tag" | "package.json" | "file", path?: string): VersionStore;
}

export const VERSION_SOURCES = ["git-tag", "package.json", "file"] as const;
export type VersionSource = (typeof VERSION_SOURCES)[number];
