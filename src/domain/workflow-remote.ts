/**
 * Remote resolution helpers intended to live on (or beside) the Workflow class.
 * (RFC-0001)
 */

import {
  resolvePushRemotes,
  resolveFetchRemotes,
  type RemoteConfig,
  toStringArray,
} from "./remote.js";

/** Minimal surfaces needed from the existing domain types. */
export interface BranchTypeLike {
  name: string;
  base: string;
  pushRemote?: string | string[];
}

export interface BaseBranchLike {
  name: string;
  remote?: string;
}

export interface WorkflowConfigLike {
  remote: RemoteConfig;
  baseBranches: BaseBranchLike[];
  branchTypes: BranchTypeLike[];
}

/**
 * Resolve push remotes for a topic type according to RFC-0001 priority:
 * 1. topicType.pushRemote
 * 2. parent base branch .remote
 * 3. workflow.remote.push
 */
export function workflowResolvePushRemotes(
  config: WorkflowConfigLike,
  topicType: BranchTypeLike,
): string | string[] {
  return resolvePushRemotes({
    workflowRemote: config.remote,
    topicPushRemote: topicType.pushRemote,
    parentRemote: workflowDefaultRemote(config),
  });
}

/**
 * Resolve fetch remotes (workflow-level only for now).
 */
export function workflowResolveFetchRemotes(config: WorkflowConfigLike): string | string[] {
  return resolveFetchRemotes(config.remote);
}

/**
 * Convenience: primary (default) remote name.
 */
export function workflowDefaultRemote(config: WorkflowConfigLike): string {
  const nameList = toStringArray(config?.remote?.name, ["origin"]);
  const name = nameList[0] ?? "origin";
  return name;
}
