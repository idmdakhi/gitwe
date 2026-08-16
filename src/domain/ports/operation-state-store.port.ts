export interface OperationState {
  readonly operation: string;
  readonly currentStep: string;
  readonly completedSteps: readonly string[];
  readonly data: Readonly<Record<string, unknown>>;
  readonly startedAt: string;
}

export interface OperationStateStore {
  exists(): Promise<boolean>;
  read(): Promise<OperationState | undefined>;
  write(state: OperationState): Promise<void>;
  clear(): Promise<void>;
}
