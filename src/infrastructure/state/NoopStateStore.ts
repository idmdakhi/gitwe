import type { StateStore } from "#gitwe/domain/ports/StateStore";
import type { BranchState } from "#gitwe/kernel/state/BranchState";

export class NoopStateStore implements StateStore {
  async setState(
    _branchName: string,
    _state: BranchState,
    _metadata?: Record<string, unknown>,
  ): Promise<void> {
    // No-op
  }
  async getState(
    _branchName: string,
  ): Promise<{ state: BranchState; metadata?: Record<string, unknown> } | undefined> {
    return undefined;
  }
  async deleteState(_branchName: string): Promise<void> {
    // No-op
  }
  async listStates(): Promise<
    Array<{ branchName: string; state: BranchState; metadata?: Record<string, unknown> }>
  > {
    return [];
  }
}
