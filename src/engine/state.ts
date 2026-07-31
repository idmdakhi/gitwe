import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { OperationStateError } from "../core/errors.js";

/** Persisted progress of a multi-step operation so it can resume or roll back. */
export interface OperationState {
  version: 1;
  operation: "finish";
  branch: string;
  topicType: string;
  options: Record<string, unknown>;
  stepIndex: number;
  startedAt: string;
  originalBranch?: string;
  /** Branch name -> sha before the operation touched it. */
  snapshots: Record<string, string>;
  createdTags: string[];
}

export const STATE_FILE = "gitwe/operation.json";

export class OperationStateStore {
  private readonly file: string;

  constructor(gitDir: string) {
    this.file = join(gitDir, STATE_FILE);
  }

  exists(): boolean {
    return existsSync(this.file);
  }

  read(): OperationState | undefined {
    if (!this.exists()) return undefined;
    try {
      return JSON.parse(readFileSync(this.file, "utf8")) as OperationState;
    } catch (error) {
      throw new OperationStateError(
        `cannot read the saved operation state: ${(error as Error).message}`,
        `delete ${this.file} to start over`,
      );
    }
  }

  require(): OperationState {
    const state = this.read();
    if (state === undefined) {
      throw new OperationStateError("there is no gitwe operation to continue or abort");
    }
    return state;
  }

  write(state: OperationState): void {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  }

  clear(): void {
    rmSync(this.file, { force: true });
  }
}
