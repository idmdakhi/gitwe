/**
 * Wiring helpers so Engine.publish and FinishOperation can use multi-remote
 * without a large refactor (RFC-0001).
 */

import type { GitRepository } from "./interfaces/git-repository.js";
import type { Logger } from "./interfaces/logger.js";
import {
  workflowResolvePushRemotes,
  type WorkflowConfigLike,
  type BranchTypeLike,
} from "../domain/workflow-remote.js";
import { publishTopic, type PublishResult } from "./publish-multi-remote.js";
import { buildPushTargets, pushToRemotes, type MultiPushResult } from "./multi-remote-push.js";

/**
 * Publish a topic branch (replacement body for Engine.publish).
 */
export async function enginePublish(
  git: GitRepository,
  logger: Logger,
  config: WorkflowConfigLike,
  topicType: BranchTypeLike,
  branch: string,
  options: { remotes?: string[]; pushOptions?: string[] } = {},
): Promise<PublishResult> {
  return publishTopic(git, logger, config, topicType, branch, options);
}

/**
 * Push step for FinishOperation when --push is requested.
 * Pushes the given refs (usually target base branches + optional tags)
 * to the resolved remotes.
 */
export async function engineFinishPush(
  git: GitRepository,
  logger: Logger,
  config: WorkflowConfigLike,
  topicType: BranchTypeLike,
  refs: string[],
  options: {
    remotes?: string[];
    tags?: boolean;
    pushOptions?: string[];
  } = {},
): Promise<MultiPushResult> {
  const remotes =
    options.remotes && options.remotes.length > 0
      ? options.remotes
      : workflowResolvePushRemotes(config, topicType);

  // Push each ref to every remote (order: remotes outer, refs inner – or vice versa)
  // First version: for each remote, push all refs
  const allSucceeded: string[] = [];
  let failed: MultiPushResult["failed"];

  for (const ref of refs) {
    const targets = buildPushTargets(remotes as string[], ref, {
      setUpstreamOnFirst: false,
      tags: options.tags,
      pushOptions: options.pushOptions,
    });
    const result = await pushToRemotes(git, logger, targets);
    allSucceeded.push(...result.succeeded);
    if (result.failed) {
      failed = result.failed;
      break; // fail-fast
    }
  }

  return {
    succeeded: [...new Set(allSucceeded)],
    failed,
  };
}
