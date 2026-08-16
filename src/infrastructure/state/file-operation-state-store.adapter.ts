import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  OperationState,
  OperationStateStore,
} from "../../domain/ports/operation-state-store.port.js";

/**
 * Persists in-progress, resumable operations (e.g. a `finish` stopped
 * on a merge conflict) under the git directory:
 *
 *   .git/gitwe/operation.json
 *
 * so `--continue` / `--abort` work across separate CLI invocations and
 * the file stays out of the working tree (aligned with E2E + docs).
 *
 * Assumes a normal repository layout (`<root>/.git/...`). Linked worktrees
 * would need `git rev-parse --git-dir` resolution in a later change.
 */
export class FileOperationStateStore implements OperationStateStore {
  private readonly file: string;

  constructor(root: string) {
    this.file = join(root, ".git", "gitwe", "operation.json");
  }

  async exists(): Promise<boolean> {
    return existsSync(this.file);
  }

  async read(): Promise<OperationState | undefined> {
    if (!existsSync(this.file)) return undefined;
    const raw = await readFile(this.file, "utf8");
    return JSON.parse(raw) as OperationState;
  }

  async write(state: OperationState): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    await writeFile(this.file, JSON.stringify(state, null, 2), "utf8");
  }

  async clear(): Promise<void> {
    if (existsSync(this.file)) await rm(this.file);
  }
}
