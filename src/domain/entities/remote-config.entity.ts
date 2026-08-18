import type { PushOptions } from "../ports/git-repository.port.js";
/**
 * Override settings for a specific branch or type
 */
export interface RemoteOverride {
  /** Override remote name for this branch/type */
  remote?: string | undefined;
  /** Override fetch remotes list */
  fetch?: readonly string[] | undefined;
  /** Override push remotes list */
  push?: readonly string[] | undefined;
  /** Override autoFetch */
  autoFetch?: boolean | undefined;
  /** Override autoPush */
  autoPush?: boolean | undefined;
  /** Override push options */
  pushOptions?: PushOptions | undefined;
}

/**
 * Overrides for base branches
 * Key: base branch name (e.g., "main", "develop")
 * Special key "pushOptions" for global fallback
 */
export interface BaseRemoteOverrides {
  /** Key is base branch name (e.g., "main", "develop") */
  [branchName: string]: RemoteOverride | PushOptions | undefined;
  /** Global pushOptions for all base overrides (fallback) */
  pushOptions?: PushOptions | undefined;
}

/**
 * Overrides for branch types
 * Key: branch type name (e.g., "feature", "release")
 * Special key "pushOptions" for global fallback
 */
export interface TypeRemoteOverrides {
  /** Key is branch type name (e.g., "feature", "release") */
  [typeName: string]: RemoteOverride | PushOptions | undefined;
  /** Global pushOptions for all type overrides (fallback) */
  pushOptions?: PushOptions | undefined;
}

export interface RemoteConfig {
  /** Path to separate remote config file (optional) */
  config?: string | undefined;

  /** Primary/default remote name (formerly "name") */
  default: string;

  /** List of remotes to fetch from */
  fetch: readonly string[];

  /** List of remotes to push to */
  push: readonly string[];

  /** Auto-fetch before operations */
  autoFetch: boolean;

  /** Auto-push after operations (requires explicit --push still) */
  autoPush: boolean;

  /** Default push options */
  pushOptions?: PushOptions | undefined;

  /** Overrides for specific base branches */
  baseOverrides?: BaseRemoteOverrides | undefined;

  /** Overrides for specific branch types */
  typeOverrides?: TypeRemoteOverrides | undefined;
}
