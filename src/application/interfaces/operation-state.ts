/** Persisted progress of a multi-step operation so it can resume or roll back. */
export interface OperationState {
  version: 1;
  operation: "finish";
  branch: string;
  /** @deprecated Use branchType instead */
  topicType?: string;
  /** Branch type name (e.g. 'feature', 'release') */
  branchType: string;
  options: Record<string, unknown>;
  stepIndex: number;
  startedAt: string;
  originalBranch?: string;
  /** Branch name -> sha before the operation touched it. */
  snapshots: Record<string, string>;
  createdTags: string[];
}

export const STATE_FILE = "gitwe/operation.json";

export interface OperationStateStore {
  exists(): boolean;
  read(): OperationState | undefined;
  require(): OperationState;
  write(state: OperationState): void;
  clear(): void;
}
