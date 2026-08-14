/**
 * Publish a topic branch to one or more remotes (RFC-0001).
 *
 * Replaces the single-remote publish path in Engine.
 */

import type { GitRepository } from "./interfaces/git-repository.js";
import type { Logger } from "./interfaces/logger.js";
import {
  workflowResolvePushRemotes,
  workflowDefaultRemote,
  type WorkflowConfigLike,
  type BranchTypeLike,
} from "../domain/workflow-remote.js";
import { buildPushTargets, pushToRemotes, type MultiPushResult } from "./multi-remote-push.js";

export interface PublishOptions {
  /** Override remotes for this invocation (--remote / --push-to) */
  remotes?: string[];
  /** Extra git push -o options */
  pushOptions?: string[];
}

export interface PublishResult {
  branch: string;
  /** e.g. "origin/feature/login" (primary upstream) */
  upstream: string;
  pushedTo: string[];
  failed?: { remote: string; error: string };
}

/**
 * Publish `branch` (full name) for the given topic type.
 */
export async function publishTopic(
  git: GitRepository,
  logger: Logger,
  config: WorkflowConfigLike,
  topicType: BranchTypeLike,
  branch: string,
  options: PublishOptions = {},
): Promise<PublishResult> {
  let remotes = options.remotes;
  if (!remotes || remotes.length === 0) {
    remotes = workflowResolvePushRemotes(config, topicType) as string[];
  }

  const targets = buildPushTargets(remotes, branch, {
    setUpstreamOnFirst: true,
    pushOptions: options.pushOptions,
  });

  const result: MultiPushResult = await pushToRemotes(git, logger, targets);

  if (result.failed) {
    // Partial success is still reported; caller may decide to treat as error
    return {
      branch,
      upstream: `${result.succeeded[0] ?? remotes[0]}/${branch}`,
      pushedTo: result.succeeded,
      failed: result.failed,
    };
  }

  const primary = result.succeeded[0] ?? workflowDefaultRemote(config);
  return {
    branch,
    upstream: `${primary}/${branch}`,
    pushedTo: result.succeeded,
  };
}
