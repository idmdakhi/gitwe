export interface ExecutionEvents {
  emit(
    event: string,

    payload?: unknown,
  ): void;
}

