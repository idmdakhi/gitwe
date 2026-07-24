import type { BranchState, BranchLifecycleStatus } from "#gitwe/domain/valueObjects/BranchState";

/**
 * Port for persisting workflow runtime state across CLI invocations.
 * Kept separate from GitRepository because this is gitwe's own bookkeeping,
 * not something git tracks — a branch is git's concern, its lifecycle
 * status and metadata are gitwe's. Also doubles as a namespaced key-value
 * store so plugins/enterprise features can persist arbitrary data without
 * each needing their own file format.
 */
export interface StateStore {
  getBranch(branchName: string): Promise<BranchState | undefined>;
  saveBranch(state: BranchState): Promise<void>;
  deleteBranch(branchName: string): Promise<void>;
  listBranches(filter?: { status?: BranchLifecycleStatus }): Promise<BranchState[]>;

  /** Free-form namespaced storage, e.g. namespace="plugin:jira", key="feature/login" -> ticket id. */
  getValue<T = unknown>(namespace: string, key: string): Promise<T | undefined>;
  setValue<T = unknown>(namespace: string, key: string, value: T): Promise<void>;
}
