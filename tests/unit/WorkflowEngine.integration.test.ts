import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { ShellGitAdapter } from "../../src/adapters/ShellGitAdapter";
import { WorkflowEngine } from "../../src/core/WorkflowEngine";
import { gitFlowDefinition } from "../../src/core/WorkflowDefinition";

function sh(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd });
}

describe("WorkflowEngine + ShellGitAdapter (integration, real repo)", () => {
  let repoDir: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), "gwe-integration-"));
    sh(repoDir, "init", "-b", "main");
    sh(repoDir, "config", "user.email", "test@example.com");
    sh(repoDir, "config", "user.name", "Test User");
    writeFileSync(join(repoDir, "README.md"), "# repo\n");
    sh(repoDir, "add", ".");
    sh(repoDir, "commit", "-m", "initial commit");
    sh(repoDir, "checkout", "-b", "develop");

    engine = new WorkflowEngine(new ShellGitAdapter(repoDir), gitFlowDefinition);
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  it("runs start() then finish() end-to-end for a feature branch", async () => {
    const branch = await engine.start("feature", "login");
    expect(branch).toBe("feature/login");
    expect(await engine.currentBranch()).toBe("feature/login");

    appendFileSync(join(repoDir, "login.ts"), "export const login = () => {};\n");
    sh(repoDir, "add", ".");
    sh(repoDir, "commit", "-m", "add login");

    const result = await engine.finish(branch);

    expect(result.merges).toHaveLength(1);
    expect(result.merges[0]?.target).toBe("develop");
    expect(result.deleted).toBe(true);

    const remaining = await engine.listBranches();
    expect(remaining.map((b) => b.name)).not.toContain("feature/login");
  });
});
