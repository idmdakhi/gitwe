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
import type { Engine } from "../../src/application/engine.js";
import { createEngine } from "../../src/di/create-engine.js";

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
    repo.git("config", "tag.gpgsign", "false");
    repo.git("config", "user.signingkey", "");
    repo.git("config", "core.editor", "true");
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

  async engine(config?: WorkflowConfig, enableVersioning = false): Promise<Engine> {
    const workflow = config ?? this.preset("classic");

    if (enableVersioning) {
      if (!workflow.versioning) {
        workflow.versioning = {
          enabled: true,
          tagPrefix: "v",
          format: "{{tagPrefix}}{{major}}.{{minor}}.{{patch}}",
          tag: ["release", "hotfix"],
          bumpRules: { major: [], minor: ["release", "feature"], patch: ["hotfix"] },
          path: ".gitwe/VERSION.yaml",
          autoCommit: true,
          commitMessage: "chore: bump version to {{version}}",
          initialVersion: "0.1.0",
        };
      } else {
        workflow.versioning.enabled = true;
        // fill missing fields with defaults
        workflow.versioning.tag ??= ["release", "hotfix"];
        workflow.versioning.bumpRules ??= {
          major: [],
          minor: ["release", "feature"],
          patch: ["hotfix"],
        };
        workflow.versioning.path ??= ".gitwe/VERSION.yaml";
        workflow.versioning.tagPrefix ??= "v";
        workflow.versioning.format ??= "{{tagPrefix}}{{major}}.{{minor}}.{{patch}}";
        workflow.versioning.autoCommit ??= true;
        workflow.versioning.commitMessage ??= "chore: bump version to {{version}}";
      }
    }

    await this.createBaseBranches(workflow);
    return createEngine({ root: this.path, config: workflow });
  }

  preset(name: PresetName, overrides: PresetOverrides = {}): WorkflowConfig {
    return createPreset(name, overrides);
  }

  private async createBaseBranches(config: WorkflowConfig): Promise<void> {
    for (const base of config.baseBranches) {
      if (this.branches().includes(base.name)) continue;
      const start =
        base.base !== undefined && this.branches().includes(base.base) ? base.base : "HEAD";
      this.git("branch", base.name, start);
    }
  }

  destroy(): void {
    try {
      rmSync(this.path, { recursive: true, force: true, maxRetries: 3 });
    } catch {
      // در Windows ممکن است خطا بدهد، صبر کنید و دوباره تلاش کنید
      setTimeout(() => {
        try {
          rmSync(this.path, { recursive: true, force: true, maxRetries: 3 });
        } catch {
          // نادیده گرفته شود
        }
      }, 100);
    }
  }
}
