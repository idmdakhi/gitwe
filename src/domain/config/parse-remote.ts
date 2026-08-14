/**
 * Remote field parsing helpers for parseWorkflowConfig (RFC-0001).
 */

import { normaliseRemote } from "../remote.js";
import { ConfigError } from "../errors.js";
import type { RemoteConfig, RemoteInput } from "../remote.js";

/**
 * Parse and validate the top-level `remote` field.
 * Throws ConfigError on invalid shapes.
 */
export function parseRemoteField(raw: unknown): RemoteConfig {
  if (raw == null) {
    return normaliseRemote(undefined);
  }

  if (typeof raw === "string") {
    if (!raw.trim()) {
      throw new ConfigError(
        "remote must be a non-empty string or an object",
        "Example: remote: origin  or  remote: { default: origin, push: [origin, mirror] }",
      );
    }
    return normaliseRemote(raw);
  }

  if (typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;

    // Reject completely empty object
    if (Object.keys(obj).length === 0) {
      throw new ConfigError(
        "remote object must contain at least 'default' (or 'name')",
        "Example: remote: { default: origin }",
      );
    }

    // Basic type checks
    for (const key of ["default", "name"] as const) {
      if (key in obj && typeof obj[key] !== "string") {
        throw new ConfigError(`remote.${key} must be a string`);
      }
    }
    for (const key of ["fetch", "push"] as const) {
      if (key in obj) {
        const v = obj[key];
        if (typeof v !== "string" && !Array.isArray(v)) {
          throw new ConfigError(`remote.${key} must be a string or an array of strings`);
        }
        if (Array.isArray(v) && v.some((item) => typeof item !== "string")) {
          throw new ConfigError(`remote.${key} array must contain only strings`);
        }
      }
    }

    return normaliseRemote(obj as RemoteInput);
  }

  throw new ConfigError(
    "remote must be a string or an object",
    "Example: remote: origin  or  remote: { default: origin, push: [origin, mirror] }",
  );
}
/**
 * Drop-in wiring for parseWorkflowConfig (RFC-0001).
 *
 * In the real parse.ts, after the raw object is loaded:
 *
 *   import { applyRemoteParsing } from "./parse-remote-wire.js";
 *   const { remote, baseBranches, branchTypes } = applyRemoteParsing(raw, baseBranches, branchTypes);
 *
 * This keeps the main parser free of remote-specific detail.
 */

export interface BranchLike {
  name: string;
  remote?: string;
  pushRemote?: string | string[];
  [key: string]: unknown;
}

/**
 * Apply remote normalisation and per-branch overrides onto already-parsed
 * baseBranches / branchTypes arrays.
 */
export function applyRemoteParsing(
  raw: Record<string, unknown>,
  baseBranches: BranchLike[],
  branchTypes: BranchLike[],
): {
  remote: RemoteConfig;
  baseBranches: BranchLike[];
  branchTypes: BranchLike[];
} {
  const { remote, baseRemotes, topicPushRemotes } = parseRemoteSection(raw);

  const bases = baseBranches.map((b) => {
    const override = baseRemotes.get(b.name);
    return override != null ? { ...b, remote: override } : b;
  });

  const types = branchTypes.map((t) => {
    const override = topicPushRemotes.get(t.name);
    return override != null ? { ...t, pushRemote: override } : t;
  });

  return { remote, baseBranches: bases, branchTypes: types };
}
/**
 * Integration snippet for parseWorkflowConfig (RFC-0001).
 *
 * In the real parse.ts, after reading the raw config object, call:
 *
 *   import { parseRemoteField } from "./parse-remote.js";
 *   ...
 *   const remote = parseRemoteField(raw.remote);
 *
 * And assign it to the returned WorkflowConfig:
 *   return { ...otherFields, remote };
 *
 * Also accept optional per-branch fields:
 *   baseBranches[].remote      (string)
 *   branchTypes[].pushRemote   (string | string[])
 */

/**
 * Extract and normalise the remote section + per-branch overrides
 * from a raw config object. Safe to call from parseWorkflowConfig.
 */
export function parseRemoteSection(raw: Record<string, unknown>): {
  remote: RemoteConfig;
  /** Map of base-branch name → optional remote override */
  baseRemotes: Map<string, string>;
  /** Map of topic-type name → optional pushRemote override */
  topicPushRemotes: Map<string, string | string[]>;
} {
  const remote = parseRemoteField(raw.remote);

  const baseRemotes = new Map<string, string>();
  const topicPushRemotes = new Map<string, string | string[]>();

  // baseBranches[].remote
  const bases = raw.baseBranches;
  if (Array.isArray(bases)) {
    for (const b of bases) {
      if (b && typeof b === "object" && typeof (b as any).name === "string") {
        const r = (b as any).remote;
        if (r != null) {
          if (typeof r !== "string" || !r.trim()) {
            throw new ConfigError(
              `baseBranches[].remote for "${(b as any).name}" must be a non-empty string`,
            );
          }
          baseRemotes.set((b as any).name, r.trim());
        }
      }
    }
  }

  // branchTypes[].pushRemote
  const types = raw.branchTypes;
  if (Array.isArray(types)) {
    for (const t of types) {
      if (t && typeof t === "object" && typeof (t as any).name === "string") {
        const pr = (t as any).pushRemote;
        if (pr != null) {
          if (typeof pr === "string") {
            if (!pr.trim()) {
              throw new ConfigError(
                `branchTypes[].pushRemote for "${(t as any).name}" must be non-empty`,
              );
            }
            topicPushRemotes.set((t as any).name, pr.trim());
          } else if (Array.isArray(pr)) {
            if (pr.some((x) => typeof x !== "string" || !x.trim())) {
              throw new ConfigError(
                `branchTypes[].pushRemote for "${(t as any).name}" must be a string or string[]`,
              );
            }
            topicPushRemotes.set(
              (t as any).name,
              pr.map((x: string) => x.trim()),
            );
          } else {
            throw new ConfigError(
              `branchTypes[].pushRemote for "${(t as any).name}" must be a string or string[]`,
            );
          }
        }
      }
    }
  }

  return { remote, baseRemotes, topicPushRemotes };
}
