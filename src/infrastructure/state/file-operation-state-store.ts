import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { OperationStateError } from "../../domain/errors.js";
import {
  STATE_FILE,
  type OperationState,
  type OperationStateStore,
} from "../../application/interfaces/operation-state.js";

/** File-based store under `.git/gitwe/operation.json`. */
export class FileOperationStateStore implements OperationStateStore {
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
      const data = JSON.parse(readFileSync(this.file, "utf8")) as OperationState;
      return data;
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

/** @deprecated Prefer FileOperationStateStore; kept for call-site compatibility during migration. */
export { FileOperationStateStore as OperationStateStore };
