import type { BranchState } from "#gitwe/kernel/state/BranchState";

export interface StateStore {
  /** ذخیره وضعیت یک شاخه */
  setState(
    branchName: string,
    state: BranchState,
    metadata?: Record<string, unknown>,
  ): Promise<void>;
  /** دریافت وضعیت یک شاخه */
  getState(
    branchName: string,
  ): Promise<{ state: BranchState; metadata?: Record<string, unknown> } | undefined>;
  /** حذف وضعیت یک شاخه */
  deleteState(branchName: string): Promise<void>;
  /** دریافت لیست تمام شاخه‌ها با وضعیت */
  listStates(): Promise<
    Array<{ branchName: string; state: BranchState; metadata?: Record<string, unknown> }>
  >;
}
