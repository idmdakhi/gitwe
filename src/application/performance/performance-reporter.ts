import type { IPerformanceEntry } from "../interfaces/performance-tracker.js";

export interface IPerformanceReport {
  total: number;
  entries: readonly IPerformanceEntry[];
}

export function createPerformanceReport(entries: readonly IPerformanceEntry[]): IPerformanceReport {
  return {
    total: entries.reduce((total, entry) => total + entry.duration, 0),
    entries,
  };
}
