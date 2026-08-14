/**
 * Multi-remote push helper (RFC-0001).
 *
 * Used by:
 *  - Engine.publish
 *  - the push step of FinishOperation
 *
 * Behaviour (first version):
 *  - Push sequentially in the order returned by resolvePushRemotes
 *  - Fail-fast: first remote failure aborts the rest
 *  - Caller decides which refs (branch, tags) to push
 */

import type { GitRepository } from "./interfaces/git-repository.js";
import type { Logger } from "./interfaces/logger.js";

export interface PushTarget {
  /** Remote name, e.g. "origin" */
  remote: string;
  /** Ref to push, e.g. "feature/login" or "main" */
  ref: string;
  /** Create upstream tracking (usually only for the primary remote) */
  setUpstream?: boolean;
  /** Also push tags */
  tags?: boolean;
  /** Extra push options (-o) */
  pushOptions?: string[];
}

export interface MultiPushResult {
  /** Remotes that were pushed successfully */
  succeeded: string[];
  /** Remote that failed (if any) – fail-fast stops here */
  failed?: {
    remote: string;
    error: string;
  };
}

export interface MultiPushOptions {
  /**
   * Override the resolved remote list for this single invocation
   * (from CLI --remote / --push-to).
   */
  remotes?: string[];
  /** Fail-fast (default true). When false, continue on error (future). */
  failFast?: boolean;
}

/**
 * Push the same ref to multiple remotes sequentially.
 */
export async function pushToRemotes(
  git: GitRepository,
  logger: Logger,
  targets: PushTarget[],
  options: MultiPushOptions = {},
): Promise<MultiPushResult> {
  const failFast = options.failFast !== false;
  const succeeded: string[] = [];

  // If caller supplied an explicit remote list, filter/rebuild targets
  const effectiveTargets =
    options.remotes && options.remotes.length > 0
      ? options.remotes.map((remote, idx) => ({
          remote,
          ref: targets[0]?.ref ?? "HEAD",
          setUpstream: idx === 0 && targets[0]?.setUpstream,
          tags: targets[0]?.tags,
          pushOptions: targets[0]?.pushOptions,
        }))
      : targets;

  for (const target of effectiveTargets) {
    try {
      logger.debug?.(`pushing ${target.ref} to ${target.remote}`);
      await git.push(target.remote, target.ref, {
        setUpstream: target.setUpstream,
        tags: target.tags,
        // pushOptions may not exist on every GitRepository impl yet
        ...(target.pushOptions ? { pushOptions: target.pushOptions } : {}),
      } as any);
      succeeded.push(target.remote);
      logger.info?.(`pushed ${target.ref} → ${target.remote}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error?.(`push to ${target.remote} failed: ${message}`);
      if (failFast) {
        return {
          succeeded,
          failed: { remote: target.remote, error: message },
        };
      }
      // non-fail-fast path (future): collect and continue
    }
  }

  return { succeeded };
}

/**
 * Build PushTarget[] from a resolved remote list and a single ref.
 * Convenience for publish / finish.
 */
export function buildPushTargets(
  remotes: string[],
  ref: string,
  options: {
    setUpstreamOnFirst?: boolean;
    tags?: boolean;
    pushOptions?: string[];
  } = {},
): PushTarget[] {
  return remotes.map((remote, idx) => ({
    remote,
    ref,
    setUpstream: options.setUpstreamOnFirst && idx === 0,
    tags: options.tags,
    pushOptions: options.pushOptions,
  }));
}
