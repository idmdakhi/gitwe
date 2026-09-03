import type { GitRepository } from "../../src/domain/ports/git-repository.port.js";
import type { HookRunner, HookContext, HookName } from "../../src/domain/ports/hook-runner.port.js";

/** Minimal in-memory fake so use cases are tested without real git or disk. */
export function fakeGit(overrides: Partial<GitRepository> = {}): GitRepository {
  const branches = new Set(["main", "develop", "feature/login"]);
  return {
    cwd: "/tmp/fake",
    currentBranch: async () => "feature/login",
    listBranches: async () => [...branches],
    branchExists: async (b) => branches.has(b),
    remoteBranchExists: async () => false,
    upstreamOf: async () => undefined,
    aheadBehind: async () => ({ ahead: 0, behind: 0 }),
    isAncestor: async () => false,
    isClean: async () => true,
    conflictedFiles: async () => [],
    mergeInProgress: async () => false,
    createBranch: async (b) => void branches.add(b),
    checkout: async () => undefined,
    deleteBranch: async (b) => void branches.delete(b),
    deleteRemoteBranch: async () => undefined,
    renameBranch: async () => undefined,
    merge: async () => undefined,
    continueMerge: async () => undefined,
    abortMerge: async () => undefined,
    rebase: async () => undefined,
    createTag: async () => undefined,
    tagExists: async () => false,
    fetch: async () => undefined,
    push: async () => undefined,
    remoteExists: async () => true,
    setUpstream: async () => undefined,
    listTags: async () => [],
    deleteTag: async () => undefined,
    pushTags: async () => undefined,
    deleteRemoteTag: async () => undefined,
    raw: async () => "",
    graph: async () => "",
    ...overrides,
  };
}

/** Records every hook invocation instead of running anything real. */
export function recordingHooks(): HookRunner & { calls: { name: HookName; ctx: HookContext }[] } {
  const calls: { name: HookName; ctx: HookContext }[] = [];
  return {
    calls,
    run: async (name, ctx) => {
      calls.push({ name, ctx });
    },
  };
}

export const noopHooks: HookRunner = { run: async () => undefined };
