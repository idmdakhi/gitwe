import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { ShellGitAdapter } from "../../src/adapters/ShellGitAdapter";
import { BranchAlreadyExistsError, BranchNotFoundError } from "../../src/core/errors";

function sh(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd });
}

function commit(cwd: string, filename: string, content: string, message: string): void {
  appendFileSync(join(cwd, filename), content);
  sh(cwd, "add", ".");
  sh(cwd, "commit", "-m", message);
}

describe("ShellGitAdapter", () => {
  let repoDir: string;
  let adapter: ShellGitAdapter;

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), "gitwe-test-"));
    sh(repoDir, "init", "-b", "main");
    sh(repoDir, "config", "user.email", "test@example.com");
    sh(repoDir, "config", "user.name", "Test User");
    writeFileSync(join(repoDir, "README.md"), "# test repo\n");
    sh(repoDir, "add", ".");
    sh(repoDir, "commit", "-m", "initial commit");
    adapter = new ShellGitAdapter(repoDir);
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  it("reports the current branch", async () => {
    expect(await adapter.getCurrentBranch()).toBe("main");
  });

  it("lists branches with the current one flagged", async () => {
    const branches = await adapter.listBranches();
    expect(branches).toHaveLength(1);
    expect(branches[0]).toMatchObject({ name: "main", isCurrent: true });
  });

  it("creates and checks out a new branch by default", async () => {
    await adapter.createBranch("feature/login");
    expect(await adapter.getCurrentBranch()).toBe("feature/login");
    expect(await adapter.branchExists("feature/login")).toBe(true);
  });

  it("creates a branch without checking it out when asked", async () => {
    await adapter.createBranch("feature/signup", { checkout: false });
    expect(await adapter.getCurrentBranch()).toBe("main");
    expect(await adapter.branchExists("feature/signup")).toBe(true);
  });

  it("throws when creating a branch that already exists", async () => {
    await adapter.createBranch("feature/dup", { checkout: false });
    await expect(adapter.createBranch("feature/dup", { checkout: false })).rejects.toThrow(
      BranchAlreadyExistsError,
    );
  });

  it("checks out an existing branch", async () => {
    await adapter.createBranch("develop", { checkout: false });
    await adapter.checkout("develop");
    expect(await adapter.getCurrentBranch()).toBe("develop");
  });

  it("throws when checking out a branch that doesn't exist", async () => {
    await expect(adapter.checkout("does-not-exist")).rejects.toThrow(BranchNotFoundError);
  });

  it("merges a branch into a target with --no-ff, leaving the target checked out", async () => {
    await adapter.createBranch("develop", { checkout: true });
    commit(repoDir, "README.md", "develop baseline\n", "develop baseline");

    await adapter.createBranch("feature/login", { checkout: true });
    commit(repoDir, "login.txt", "login feature\n", "add login feature");

    const result = await adapter.merge("feature/login", "develop");

    expect(result).toEqual({ source: "feature/login", target: "develop", fastForward: false });
    expect(await adapter.getCurrentBranch()).toBe("develop");
  });

  it("deletes a branch after it has been merged", async () => {
    await adapter.createBranch("develop", { checkout: true });
    await adapter.createBranch("feature/login", { checkout: true });
    commit(repoDir, "login.txt", "login feature\n", "add login feature");
    await adapter.merge("feature/login", "develop");

    await adapter.deleteBranch("feature/login");
    expect(await adapter.branchExists("feature/login")).toBe(false);
  });
});
