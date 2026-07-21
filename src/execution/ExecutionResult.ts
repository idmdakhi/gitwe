export interface ExecutionResult {
  state: ExecutionState;

  duration: number;

  steps: number;

  errors: Error[];
}
