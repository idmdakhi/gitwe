import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createPreset,
  type PresetName,
  type PresetOverrides,
} from "../../src/domain/config/presets.js";
import type { WorkflowConfig } from "../../src/domain/entities.js";
import type { Engine } from "../../src/application/Engine.js";
import { createEngine } from "../../src/di/createEngine.js";

export class TestRepo {
  readonly path: string;

  private constructor(path: string) {
    this.path = path;
  }

  static create(initialBranch = "main"): TestRepo {
    const path = mkdtempSync(join(tmpdir(), "gitwe-test-"));
    const repo = new TestRepo(path);
    repo.git("init", "-q", "-b", initialBranch, ".");
    repo.git("config", "user.email", "test@example.com");
    repo.git("config", "user.name", "gitwe test");
    repo.git("config", "commit.gpgsign", "false");
    repo.write("README.md", "# test\n");
    repo.commitAll("initial commit");
    return repo;
  }

  /** A second repository used as `origin` for remote-facing tests. */
  static createBare(): string {
    const path = mkdtempSync(join(tmpdir(), "gitwe-remote-"));
    execFileSync("git", ["init", "-q", "--bare", path]);
    return path;
  }

  git(...args: string[]): string {
    return execFileSync("git", args, { cwd: this.path, encoding: "utf8" }).trim();
  }

  write(file: string, content: string): void {
    writeFileSync(join(this.path, file), content, "utf8");
  }

  commitAll(message: string): void {
    this.git("add", "-A");
    this.git("commit", "-q", "-m", message);
  }

  commit(file: string, content: string, message = `change ${file}`): void {
    this.write(file, content);
    this.commitAll(message);
  }

  currentBranch(): string {
    return this.git("rev-parse", "--abbrev-ref", "HEAD");
  }

  branches(): string[] {
    return this.git("for-each-ref", "--format=%(refname:short)", "refs/heads")
      .split("\n")
      .filter((line) => line !== "");
  }

  tags(): string[] {
    const out = this.git("tag", "--list");
    return out === "" ? [] : out.split("\n");
  }

  log(ref = "HEAD"): string[] {
    const out = this.git("log", "--oneline", "--format=%s", ref);
    return out === "" ? [] : out.split("\n");
  }

  async engine(config?: WorkflowConfig): Promise<Engine> {
    const workflow = config ?? this.preset("classic");
    await this.createBaseBranches(workflow);
    return createEngine({
      root: this.path,
      config: workflow,
    });
  }

  preset(name: PresetName, overrides: PresetOverrides = {}): WorkflowConfig {
    return createPreset(name, overrides);
  }

  private async createBaseBranches(config: WorkflowConfig): Promise<void> {
    for (const base of config.baseBranches) {
      if (this.branches().includes(base.name)) continue;
      const start =
        base.parent !== undefined && this.branches().includes(base.parent) ? base.parent : "HEAD";
      this.git("branch", base.name, start);
    }
  }

  destroy(): void {
    rmSync(this.path, { recursive: true, force: true });
  }
}
