import type { VersioningConfig } from "./workflow-config.entity.js";

export interface PrereleaseConfig {
  enabled: boolean;
  format: string;
  types: readonly string[];
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
