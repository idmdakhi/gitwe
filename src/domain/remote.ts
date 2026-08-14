/**
 * Remote configuration types and resolution helpers (RFC-0001).
 *
 * Backward compatible:
 *   remote: "origin"                    // legacy string form
 *   remote: { default: "origin", ... }  // new object form
 */
/**
 * Remote-related extensions for domain entities (RFC-0001).
 *
 * These types are meant to be merged into the main entities.ts:
 *   - WorkflowConfig.remote becomes RemoteConfig (normalised)
 *   - BaseBranch and BranchType gain optional remote / pushRemote fields
 */

/** Optional per-base-branch remote override (used when pushing that base). */
export interface BaseBranchRemoteFields {
  /** Remote used when this base branch is pushed. */
  remote?: string;
}

/** Optional per-topic-type remote overrides. */
export interface BranchTypeRemoteFields {
  /** Remote(s) used by publish & finish --push for this topic type. */
  pushRemote?: string | string[];
}

/**
 * Shape of WorkflowConfig after remote normalisation.
 * The real WorkflowConfig should use:
 *   remote?: RemoteConfig;
 * instead of the old `remote?: string | { name: string; ... }`.
 */
export interface WorkflowConfigRemoteFields {
  remote: RemoteConfig;
}

/**
 * Suggested fields to add to existing interfaces in entities.ts:
 *
 * interface BaseBranch {
 *   ...
 *   remote?: string;          // from BaseBranchRemoteFields
 * }
 *
 * interface BranchType {
 *   ...
 *   pushRemote?: string | string[];  // from BranchTypeRemoteFields
 * }
 *
 * interface WorkflowConfig {
 *   ...
 *   remote: RemoteConfig;     // always normalised by parseWorkflowConfig
 * }
 */

/**
 * Normalise a raw `remote` field into a RemoteConfig.
 * Accepts the legacy string form and the new object form.
 */
export interface RemoteConfig {
  /** Primary remote(s) – first is default */
  name?: string | string[];
  autoFetch?: boolean;
  fetch?: string | string[];
  autoPush?: boolean;
  push?: string | string[];
}

export type RemoteInput =
  | string
  | {
      name?: string | string[];
      autoFetch?: boolean;
      fetch?: string | string[];
      autoPush?: boolean;
      push?: string | string[];
    };

/**
 * Normalise a raw `remote` field into a RemoteConfig.
 */
export function normaliseRemote(input: RemoteInput | undefined | null): RemoteConfig {
  if (input == null) {
    return {
      name: "origin",
      autoFetch: true,
      fetch: ["origin"],
      autoPush: false,
      push: ["origin"],
    };
  }

  if (typeof input === "string") {
    const trimmed = input.trim() || "origin";
    return {
      name: trimmed,
      autoFetch: true,
      fetch: [trimmed],
      autoPush: false,
      push: [trimmed],
    };
  }

  const nameList = toStringArray(input.name, ["origin"]);
  const name = nameList[0] ?? "origin";
  const fetch = toStringArray(input.fetch, nameList);
  const push = toStringArray(input.push, nameList);

  return {
    name,
    fetch: fetch.length > 0 ? fetch : name,
    push: push.length > 0 ? push : name,
    autoFetch: input.autoFetch ?? true,
    autoPush: input.autoPush ?? false,
  };
}

export function toStringArray(value: string | string[] | undefined, fallback: string[]): string[] {
  if (value == null) return fallback;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : fallback;
  }
  const list = value.map((v) => v.trim()).filter(Boolean);
  return list.length > 0 ? list : fallback;
}

/**
 * Resolve the list of remotes that should receive a push for a topic.
 * Priority: topic pushRemote > parent remote > workflow push list > default.
 */
export function resolvePushRemotes(options: {
  workflowRemote: RemoteConfig;
  topicPushRemote?: string | string[];
  parentRemote?: string;
}): string[] {
  if (options.topicPushRemote != null) {
    return toStringArray(options.topicPushRemote, [options.workflowRemote.name?.[0] ?? "origin"]);
  }
  if (options.parentRemote) {
    return [options.parentRemote];
  }
  const push = options.workflowRemote.push;
  if (typeof push === "string") return [push];
  if (Array.isArray(push)) return push;
  return [options.workflowRemote.name?.[0] ?? "origin"];
}

/**
 * Resolve the list of remotes to fetch from.
 */
export function resolveFetchRemotes(workflowRemote: RemoteConfig): string | string[] {
  return workflowRemote.fetch ?? [workflowRemote.name?.[0] ?? "origin"];
}

/**
 * Convenience: primary (default) remote name.
 */
export function defaultFetchRemotes(remote: RemoteConfig): string {
  const nameList = toStringArray(remote?.fetch, ["origin"]);
  const name = nameList[0] ?? "origin";
  return name;
}
