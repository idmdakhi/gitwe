export type BranchLifecycleStatus = "active" | "finished" | "aborted";

/**
 * Runtime state for a branch that can't be reliably derived from git alone
 * (e.g. which workflow type it started as, when, and any metadata attached
 * by plugins/enterprise features — review approvals, ticket links, etc.).
 */
export interface BranchState {
  readonly branchName: string;
  readonly branchType: string;
  readonly baseBranch: string;
  readonly status: BranchLifecycleStatus;
  readonly startedAt: string; // ISO-8601
  readonly finishedAt?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}
