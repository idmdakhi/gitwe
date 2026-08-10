import { performance } from "node:perf_hooks";
import type { IPerformanceEntry, IPerformanceTracker } from "../interfaces/performance-tracker.js";

export class PerformanceTracker implements IPerformanceTracker {
  private readonly _entries: IPerformanceEntry[] = [];

  constructor(public readonly enabled: boolean = false) {}

  start(name: string, metadata?: Record<string, unknown>): () => void {
    if (!this.enabled) {
      return () => undefined;
    }

    const startedAt = performance.now();
    let stopped = false;

    return () => {
      if (stopped) {
        return;
      }

      stopped = true;

      const endedAt = performance.now();

      this._entries.push({
        name,
        startedAt,
        endedAt,
        duration: endedAt - startedAt,
        metadata,
      });
    };
  }

  async measure<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    const end = this.start(name, metadata);

    try {
      return await operation();
    } finally {
      end();
    }
  }

  entries(): readonly IPerformanceEntry[] {
    return this._entries;
  }

  total(): number {
    return this._entries.reduce((total, entry) => total + entry.duration, 0);
  }

  reset(): void {
    this._entries.length = 0;
  }
}
