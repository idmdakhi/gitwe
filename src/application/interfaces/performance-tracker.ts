export interface IPerformanceEntry {
  readonly name: string;
  readonly duration: number;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly metadata?: Record<string, unknown>;
}

export interface IPerformanceTracker {
  readonly enabled: boolean;

  start(name: string, metadata?: Record<string, unknown>): () => void;

  measure<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>,
  ): Promise<T>;

  entries(): readonly IPerformanceEntry[];

  total(): number;

  reset(): void;
}
