// src/kernel/pipeline/PipelineState.ts
/**
 * Shared state that flows through the pipeline.
 * Capabilities can read from and write to this state.
 */
export class PipelineState {
  private readonly data = new Map<string, any>();

  // --- Merge results ---
  get mergeResults(): Array<{ source: string; target: string; fastForward: boolean }> {
    return this.get("mergeResults") ?? [];
  }
  set mergeResults(value: Array<{ source: string; target: string; fastForward: boolean }>) {
    this.set("mergeResults", value);
  }

  // --- Version ---
  get version(): string | undefined {
    return this.get("version");
  }
  set version(value: string | undefined) {
    this.set("version", value);
  }

  get previousVersion(): string | undefined {
    return this.get("previousVersion");
  }
  set previousVersion(value: string | undefined) {
    this.set("previousVersion", value);
  }

  // --- Tags ---
  get createdTags(): string[] {
    return this.get("createdTags") ?? [];
  }
  set createdTags(value: string[]) {
    this.set("createdTags", value);
  }

  // --- Deletion ---
  get deleted(): boolean {
    return this.get("deleted") ?? false;
  }
  set deleted(value: boolean) {
    this.set("deleted", value);
  }

  // --- Push ---
  get pushed(): boolean {
    return this.get("pushed") ?? false;
  }
  set pushed(value: boolean) {
    this.set("pushed", value);
  }

  // --- Generic accessors ---
  get<T>(key: string): T | undefined {
    return this.data.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.data.set(key, value);
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  toJSON(): Record<string, any> {
    return Object.fromEntries(this.data);
  }
}
