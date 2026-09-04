import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile, exec } from "node:child_process";
import { promisify } from "node:util";
import { ShellGitRepository } from "../../src/infrastructure/git/shell-git-repository.adapter.js";
import { ConflictError } from "../../src/domain/errors/index.js";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

async function initTestRepo(cwd: string) {
  await runGit(cwd, ["init", "-b", "main"]);
  await runGit(cwd, ["config", "user.name", "Test"]);
  await runGit(cwd, ["config", "user.email", "test@example.com"]);
  await runGit(cwd, ["config", "commit.gpgsign", "false"]);
  await runGit(cwd, ["config", "tag.gpgsign", "false"]);
}

async function runGit(cwd: string, args: string[]) {
  await execFileAsync("git", args, { cwd });
}

async function runShell(cwd: string, command: string) {
  await execAsync(command, { cwd, shell: true as any });
}

describe("ShellGitRepository", () => {
  let tempDir: string;
  let repo: ShellGitRepository;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "gitwe-test-"));
    await initTestRepo(tempDir);
    await runGit(tempDir, ["commit", "--allow-empty", "-m", "initial"]);
    repo = new ShellGitRepository(tempDir);
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns current branch", async () => {
    const branch = await repo.currentBranch();
    expect(branch).toBe("main");
  });

  it("creates and checks out a new branch", async () => {
    await repo.createBranch("feature/test", "main");
    expect(await repo.branchExists("feature/test")).toBe(true);
    await repo.checkout("feature/test");
    expect(await repo.currentBranch()).toBe("feature/test");
  });

  it("lists branches with pattern", async () => {
    await repo.createBranch("feature/other", "main");
    const branches = await repo.listBranches("feature/*");
    expect(branches).toContain("feature/test");
    expect(branches).toContain("feature/other");
    expect(branches).not.toContain("main");
  });

  it("deletes a branch", async () => {
    await repo.createBranch("feature/todelete", "main");
    await repo.deleteBranch("feature/todelete");
    expect(await repo.branchExists("feature/todelete")).toBe(false);
  });

  it("merges a branch and creates a merge commit", async () => {
    await repo.checkout("feature/test");
    await runGit(tempDir, ["commit", "--allow-empty", "-m", "feature commit"]);
    await repo.checkout("main");
    await repo.merge("feature/test");
    const log = await repo.raw(["log", "--oneline"]);
    expect(log).toContain("feature commit");
  });

  it("throws ConflictError on merge conflict", async () => {
    const conflictDir = await mkdtemp(join(tmpdir(), "gitwe-conflict-"));
    await initTestRepo(conflictDir);
    await runGit(conflictDir, ["commit", "--allow-empty", "-m", "base"]);

    await runGit(conflictDir, ["checkout", "-b", "feature/a"]);
    await runShell(conflictDir, 'echo "a" > file.txt');
    await runGit(conflictDir, ["add", "file.txt"]);
    await runGit(conflictDir, ["commit", "-m", "a"]);

    await runGit(conflictDir, ["checkout", "-b", "feature/b", "main"]);
    await runShell(conflictDir, 'echo "b" > file.txt');
    await runGit(conflictDir, ["add", "file.txt"]);
    await runGit(conflictDir, ["commit", "-m", "b"]);

    // Bring feature/b's version of file.txt into main first, so that merging
    // feature/a afterwards produces a real conflict on file.txt.
    await runGit(conflictDir, ["checkout", "main"]);
    await runGit(conflictDir, ["merge", "feature/b"]);

    const conflictRepo = new ShellGitRepository(conflictDir);
    await conflictRepo.checkout("main");
    await expect(conflictRepo.merge("feature/a")).rejects.toThrow(ConflictError);
    const conflicts = await conflictRepo.conflictedFiles();
    expect(conflicts).toContain("file.txt");

    await rm(conflictDir, { recursive: true, force: true });
  });

  // تست fetch با ایجاد یک remote محلی
  it("fetches from remote", async () => {
    const remoteDir = await mkdtemp(join(tmpdir(), "gitwe-remote-"));
    await runGit(remoteDir, ["init", "--bare"]);
    await runGit(tempDir, ["remote", "add", "origin", remoteDir]);
    await expect(repo.fetch("origin")).resolves.not.toThrow();
    await rm(remoteDir, { recursive: true, force: true });
  });
});
