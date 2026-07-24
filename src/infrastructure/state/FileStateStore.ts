import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import path from "node:path";
import type { StateStore } from "#gitwe/domain/ports/StateStore";
import type { BranchState, BranchLifecycleStatus } from "#gitwe/domain/valueObjects/BranchState";
import { StateCorruptedError } from "#gitwe/domain/errors";

interface StateFile {
  branches: Record<string, BranchState>;
  values: Record<string, Record<string, unknown>>; // namespace -> key -> value
}

const EMPTY: StateFile = { branches: {}, values: {} };

export class FileStateStore implements StateStore {
  private readonly filePath: string;

  constructor(cwd: string) {
    this.filePath = path.join(cwd, ".gitwe", "state", "state.json");
  }

  private async read(): Promise<StateFile> {
    try {
      const raw = await readFile(this.filePath, "utf-8");
      return JSON.parse(raw) as StateFile;
    } catch (error: any) {
      if (error.code === "ENOENT") return structuredClone(EMPTY);
      throw new StateCorruptedError(this.filePath, error.message);
    }
  }

  /** Write-to-temp-then-rename so a crash mid-write can't corrupt state.json. */
  private async write(data: StateFile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp-${process.pid}`;
    await writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
    await rename(tmp, this.filePath);
  }

  async getBranch(branchName: string): Promise<BranchState | undefined> {
    return (await this.read()).branches[branchName];
  }

  async saveBranch(state: BranchState): Promise<void> {
    const data = await this.read();
    data.branches[state.branchName] = state;
    await this.write(data);
  }

  async deleteBranch(branchName: string): Promise<void> {
    const data = await this.read();
    delete data.branches[branchName];
    await this.write(data);
  }

  async listBranches(filter?: { status?: BranchLifecycleStatus }): Promise<BranchState[]> {
    const all = Object.values((await this.read()).branches);
    return filter?.status ? all.filter((b) => b.status === filter.status) : all;
  }

  async getValue<T>(namespace: string, key: string): Promise<T | undefined> {
    return (await this.read()).values[namespace]?.[key] as T | undefined;
  }

  async setValue<T>(namespace: string, key: string, value: T): Promise<void> {
    const data = await this.read();
    data.values[namespace] ??= {};
    data.values[namespace][key] = value;
    await this.write(data);
  }
}
