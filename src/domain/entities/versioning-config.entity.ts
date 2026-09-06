export type VersionBump = "major" | "minor" | "patch" | "prerelease" | "none";
export interface PrereleaseConfig {
  enabled: boolean;
  format: string;
  types: readonly string[];
}

// domain/entities/versioning-config.entity.ts (جدید)
export interface VersioningConfig {
  enabled: boolean;
  config?: string;
  tagPrefix?: string;
  tagTypes?: readonly string[];
  tagTargets?: readonly string[];
  bumpRules?: {
    major?: readonly string[];
    minor?: readonly string[];
    patch?: readonly string[];
    prerelease?: readonly string[];
  };
  format?: string;
  annotated?: boolean;
  sign?: boolean;
  signingKey?: string;
  pushTags?: boolean;
  autoCommit?: boolean;
  commitMessage?: string;
  /**
   * Version to start from when versioning is enabled, no --current-version
   * was given, and no existing "${tagPrefix}X.Y.Z" tag can be found (i.e.
   * this is the very first release). Defaults to "0.1.0".
   */
  initialVersion?: string;
  prerelease?: {
    enabled: boolean;
    format: string;
    types: readonly string[];
  };
}

export interface VersioningFullConfig extends VersioningConfig {
  format?: string;
  annotated?: boolean;
  sign?: boolean;
  signingKey?: string;
  pushTags?: boolean;
  autoCommit?: boolean;
  commitMessage?: string;
  prerelease?: PrereleaseConfig;
}

export interface PrereleaseConfig {
  enabled: boolean;
  format: string;
  types: readonly string[];
}
