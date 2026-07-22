import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { ShellGitRepository } from "../../src/infrastructure/git/ShellGitRepository";
import { BranchAlreadyExistsError, BranchNotFoundError } from "../../src/domain/errors";

function sh(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd });
}

function commit(cwd: string, filename: string, content: string, message: string): void {
  appendFileSync(join(cwd, filename), content);
  sh(cwd, "add", ".");
  sh(cwd, "commit", "-m", message);
}

describe("ShellGitRepository", () => {
  let repoDir: string;
  let repo: ShellGitRepository;

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), "gitwe-test-"));
    sh(repoDir, "init", "-b", "main");
    sh(repoDir, "config", "user.email", "test@example.com");
    sh(repoDir, "config", "user.name", "Test User");
    writeFileSync(join(repoDir, "README.md"), "# test repo\n");
    sh(repoDir, "add", ".");
    sh(repoDir, "commit", "-m", "initial commit");
    repo = new ShellGitRepository(repoDir);
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  it("reports the current branch", async () => {
    expect(await repo.getCurrentBranch()).toBe("main");
  });

  it("lists branches with the current one flagged", async () => {
    const branches = await repo.listBranches();
    expect(branches).toHaveLength(1);
    expect(branches[0]).toMatchObject({ name: "main", isCurrent: true });
  });

  it("creates and checks out a new branch by default", async () => {
    await repo.createBranch("feature/login");
    expect(await repo.getCurrentBranch()).toBe("feature/login");
    expect(await repo.branchExists("feature/login")).toBe(true);
  });

  it("creates a branch without checking it out when asked", async () => {
    await repo.createBranch("feature/signup", { checkout: false });
    expect(await repo.getCurrentBranch()).toBe("main");
    expect(await repo.branchExists("feature/signup")).toBe(true);
  });

  it("throws when creating a branch that already exists", async () => {
    await repo.createBranch("feature/dup", { checkout: false });
    await expect(repo.createBranch("feature/dup", { checkout: false })).rejects.toThrow(
      BranchAlreadyExistsError,
    );
  });

  it("throws when checking out a branch that doesn't exist", async () => {
    await expect(repo.checkout("does-not-exist")).rejects.toThrow(BranchNotFoundError);
  });

  it("merges a branch into a target with --no-ff, leaving the target checked out", async () => {
    await repo.createBranch("develop", { checkout: true });
    commit(repoDir, "README.md", "develop baseline\n", "develop baseline");

    await repo.createBranch("feature/login", { checkout: true });
    commit(repoDir, "login.txt", "login feature\n", "add login feature");

    const result = await repo.merge("feature/login", "develop");

    expect(result).toEqual({ source: "feature/login", target: "develop", fastForward: false });
    expect(await repo.getCurrentBranch()).toBe("develop");
  });

  it("reports a fast-forward merge accurately when --no-ff isn't forced", async () => {
    await repo.createBranch("feature/login", { checkout: true });
    commit(repoDir, "login.txt", "login feature\n", "add login feature");

    const result = await repo.merge("feature/login", "main", { noFastForward: false });

    expect(result.fastForward).toBe(true);
  });

  it("deletes a branch after it has been merged", async () => {
    await repo.createBranch("develop", { checkout: true });
    await repo.createBranch("feature/login", { checkout: true });
    commit(repoDir, "login.txt", "login feature\n", "add login feature");
    await repo.merge("feature/login", "develop");

    await repo.deleteBranch("feature/login");
    expect(await repo.branchExists("feature/login")).toBe(false);
  });

  it("reports a clean working tree, and a dirty one after an uncommitted change", async () => {
    expect(await repo.isWorkingTreeClean()).toBe(true);
    appendFileSync(join(repoDir, "README.md"), "uncommitted change\n");
    expect(await repo.isWorkingTreeClean()).toBe(false);
  });
});

