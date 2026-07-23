import { ExecutionState } from "#gitwe/execution/ExecutionState";
export interface ExecutionResult {
  state: ExecutionState;

  duration: number;

  steps: number;

  errors: Error[];
}
