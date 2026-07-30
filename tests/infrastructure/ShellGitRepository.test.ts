import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { ShellGitRepository } from "#gitwe/infrastructure/git/ShellGitRepository";
import { BranchAlreadyExistsError, BranchNotFoundError } from "#gitwe/domain/errors";

function sh(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "pipe" });
}

function commit(cwd: string, filename: string, content: string, message: string): void {
  appendFileSync(join(cwd, filename), content);
  sh(cwd, "add", ".");
  sh(cwd, "config", "commit.gpgsign", "false");
  sh(cwd, "config", "tag.gpgsign", "false");
  sh(cwd, "commit", "--no-gpg-sign", "-m", message);
}

describe("ShellGitRepository", () => {
  let repoDir: string;
  let repo: ShellGitRepository;

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), "gitwe-test-"));
    sh(repoDir, "init", "-b", "main");
    sh(repoDir, "config", "user.email", "test@example.com");
    sh(repoDir, "config", "user.name", "Test User");
    sh(repoDir, "config", "commit.gpgsign", "false");
    sh(repoDir, "config", "tag.gpgsign", "false");
    writeFileSync(join(repoDir, "README.md"), "# test repo\n");
    sh(repoDir, "add", ".");
    sh(repoDir, "commit", "--no-gpg-sign", "-m", "initial commit");
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

  it("creates a branch from an explicit start point, not just HEAD", async () => {
    await repo.createBranch("develop", { checkout: true });
    commit(repoDir, "develop.txt", "develop work\n", "develop work");
    await repo.checkout("main");

    await repo.createBranch("feature/from-develop", { from: "develop", checkout: true });

    expect(await repo.branchExists("feature/from-develop")).toBe(true);
    // The new branch must actually contain develop's commit, i.e. it was
    // branched from `develop`, not from `main` (a reversed `git branch`
    // argument order would silently create it from the wrong point, or
    // fail outright since "develop feature/from-develop" isn't valid).
    expect(await repo.isMerged("develop", "feature/from-develop")).toBe(true);
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

  it("rebases a branch onto another, leaving it checked out with the new history", async () => {
    await repo.createBranch("develop", { checkout: true });
    commit(repoDir, "develop.txt", "develop work\n", "develop work");
    await repo.checkout("main");

    await repo.createBranch("feature/login", { from: "main", checkout: true });
    commit(repoDir, "login.txt", "login feature\n", "add login feature");

    await repo.rebase("feature/login", "develop");

    expect(await repo.getCurrentBranch()).toBe("feature/login");
    // After a clean rebase onto develop, feature/login's history now
    // includes develop's commit too.
    expect(await repo.isMerged("develop", "feature/login")).toBe(true);
  });

  it("throws when rebasing a branch that doesn't exist", async () => {
    await expect(repo.rebase("nonexistent", "main")).rejects.toThrow(BranchNotFoundError);
  });

  it("throws when rebasing onto a branch that doesn't exist", async () => {
    await repo.createBranch("feature/login", { checkout: true });
    await expect(repo.rebase("feature/login", "nonexistent")).rejects.toThrow(BranchNotFoundError);
  });

  it("captures stdout (not just stderr) on a failed git command, since git writes conflict diagnostics there", async () => {
    await repo.createBranch("develop", { checkout: true });
    writeFileSync(join(repoDir, "shared.txt"), "develop version\n");
    sh(repoDir, "add", ".");
    sh(repoDir, "commit", "--no-gpg-sign", "-m", "develop change");

    await repo.checkout("main");
    await repo.createBranch("feature/clash", { checkout: true });
    writeFileSync(join(repoDir, "shared.txt"), "feature version\n");
    sh(repoDir, "add", ".");
    sh(repoDir, "commit", "--no-gpg-sign", "-m", "feature change");

    await expect(repo.merge("develop", "feature/clash")).rejects.toMatchObject({
      code: "GIT_COMMAND_FAILED",
      stdout: expect.stringContaining("CONFLICT"),
    });
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
