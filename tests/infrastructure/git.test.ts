import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ShellGitRepository } from "../../src/infrastructure/git/shell-git-repository.js";
import { TestRepo } from "../support/repo.js";
import { ConflictError, GitError } from "../../src/domain/errors.js";
import { join } from "node:path";

describe("ShellGitRepository", () => {
  let repo: TestRepo;
  let git: ShellGitRepository;

  beforeEach(() => {
    repo = TestRepo.create();
    git = new ShellGitRepository({ cwd: repo.path });
  });

  afterEach(() => {
    repo.destroy();
  });

  it("should get repository root", async () => {
    const root = await git.root();
    expect(root).toBe(repo.path);
  });

  it("should get git directory", async () => {
    const gitDir = await git.gitDir();
    expect(gitDir).toBe(join(repo.path, ".git"));
  });

  it("should get current branch", async () => {
    const branch = await git.currentBranch();
    expect(branch).toBe("main");
  });

  it("should list branches", async () => {
    const branches = await git.listBranches();
    expect(branches).toContain("main");
  });

  it("should check if branch exists", async () => {
    expect(await git.branchExists("main")).toBe(true);
    expect(await git.branchExists("nonexistent")).toBe(false);
  });

  it("should check if remote exists", async () => {
    expect(await git.remoteExists("origin")).toBe(false);
    repo.git("remote", "add", "origin", "https://example.com");
    expect(await git.remoteExists("origin")).toBe(true);
  });

  it("should create a branch", async () => {
    await git.createBranch("feature/test", "main");
    expect(await git.branchExists("feature/test")).toBe(true);
  });

  it("should checkout a branch", async () => {
    await git.createBranch("feature/test", "main");
    await git.checkout("feature/test");
    expect(await git.currentBranch()).toBe("feature/test");
  });

  it("should delete a branch", async () => {
    await git.createBranch("feature/test", "main");
    await git.deleteBranch("feature/test", false);
    expect(await git.branchExists("feature/test")).toBe(false);
  });

  it("should rename a branch", async () => {
    await git.createBranch("feature/old", "main");
    await git.renameBranch("feature/old", "feature/new");
    expect(await git.branchExists("feature/old")).toBe(false);
    expect(await git.branchExists("feature/new")).toBe(true);
  });

  it("should check if clean", async () => {
    expect(await git.isClean()).toBe(true);
    // untracked files are ignored (--untracked-files=no)
    repo.write("newfile.txt", "content");
    expect(await git.isClean()).toBe(true);
    repo.write("README.md", "dirty");
    expect(await git.isClean()).toBe(false);
  });

  it("should get upstream of branch", async () => {
    const upstream = await git.upstreamOf("main");
    expect(upstream).toBeUndefined();
  });

  it("should compute ahead/behind", async () => {
    await git.createBranch("feature/test", "main");
    await git.checkout("feature/test");
    repo.commit("a.txt", "a", "commit");
    const counts = await git.aheadBehind("feature/test", "main");
    expect(counts.ahead).toBe(1);
    expect(counts.behind).toBe(0);
  });

  it("should check ancestor relationship", async () => {
    await git.createBranch("feature/test", "main");
    expect(await git.isAncestor("main", "feature/test")).toBe(true);
    await git.checkout("feature/test");
    repo.commit("a.txt", "a", "commit");
    expect(await git.isAncestor("main", "feature/test")).toBe(true);
  });

  it("should fetch from remote", async () => {
    const remote = TestRepo.createBare();
    repo.git("remote", "add", "origin", remote);
    repo.git("push", "-q", "origin", "main");
    await git.fetch("origin");
    // Should not throw
  });

  it("should push to remote", async () => {
    const remote = TestRepo.createBare();
    repo.git("remote", "add", "origin", remote);
    await git.push("origin", "main", { setUpstream: true });
    // Should not throw
  });

  it("should merge a branch", async () => {
    await git.createBranch("feature/test", "main");
    await git.checkout("feature/test");
    repo.commit("a.txt", "a", "feature");
    await git.checkout("main");
    const result = await git.merge("feature/test", { noFf: true });
    expect(result).toBeUndefined();
  });

  it("should throw on merge conflict", async () => {
    await git.createBranch("feature/test", "main");
    await git.checkout("feature/test");
    repo.write("shared.txt", "feature content");
    repo.commitAll("feature commit");
    await git.checkout("main");
    repo.write("shared.txt", "main content");
    repo.commitAll("main commit");
    await expect(git.merge("feature/test", { noFf: true })).rejects.toThrow(ConflictError);
  });

  it("should abort merge", async () => {
    await git.createBranch("feature/test", "main");
    await git.checkout("feature/test");
    repo.write("shared.txt", "feature content");
    repo.commitAll("feature commit");
    await git.checkout("main");
    repo.write("shared.txt", "main content");
    repo.commitAll("main commit");
    try {
      await git.merge("feature/test", { noFf: true });
    } catch {
      // Expected
    }
    await git.abortMerge();
    expect(await git.isClean()).toBe(true);
  });

  it("should rebase", async () => {
    await git.createBranch("feature/test", "main");
    await git.checkout("feature/test");
    repo.commit("a.txt", "a", "feature");
    await git.checkout("main");
    repo.commit("b.txt", "b", "main");
    await git.checkout("feature/test");
    await git.rebase("main");
    expect(await git.isClean()).toBe(true);
  });

  it("should abort rebase", async () => {
    await git.createBranch("feature/test", "main");
    await git.checkout("feature/test");
    repo.write("shared.txt", "feature");
    repo.commitAll("feature commit");
    await git.checkout("main");
    repo.write("shared.txt", "main");
    repo.commitAll("main commit");
    await git.checkout("feature/test");
    try {
      await git.rebase("main");
    } catch {
      // Expected conflict
    }
    await git.abortRebase();
    expect(await git.isClean()).toBe(true);
  });

  it("should commit with message", async () => {
    repo.write("a.txt", "a");
    repo.git("add", "a.txt");
    await git.commit("test commit");
    const log = repo.log();
    expect(log[0]).toBe("test commit");
  });

  it("should check if merge in progress", async () => {
    expect(await git.mergeInProgress()).toBe(false);
  });

  it("should check if rebase in progress", async () => {
    expect(await git.rebaseInProgress()).toBe(false);
  });

  it("should list tags", async () => {
    const tags = await git.tags();
    expect(tags).toEqual([]);
    repo.git("tag", "v1.0.0");
    expect(await git.tags()).toEqual(["v1.0.0"]);
  });

  it("should create tag", async () => {
    await git.createTag("v1.0.0", { message: "release" });
    expect(await git.tags()).toContain("v1.0.0");
  });

  it("should delete tag", async () => {
    repo.git("tag", "v1.0.0");
    await git.deleteTag("v1.0.0");
    expect(await git.tags()).not.toContain("v1.0.0");
  });

  it("should execute raw git commands", async () => {
    const output = await git.raw(["rev-parse", "HEAD"]);
    expect(output).toBe(repo.git("rev-parse", "HEAD"));
  });

  it("should get conflicted files", async () => {
    const conflicts = await git.conflictedFiles();
    expect(conflicts).toEqual([]);
  });

  it("should reset hard", async () => {
    repo.commit("a.txt", "a", "commit");
    const sha = repo.git("rev-parse", "HEAD");
    repo.write("a.txt", "changed");
    await git.resetHard(sha);
    expect(repo.git("show", "HEAD:a.txt")).toBe("a");
  });

  it("should check if has staged changes", async () => {
    expect(await git.hasStagedChanges()).toBe(false);
    repo.write("a.txt", "a");
    repo.git("add", "a.txt");
    expect(await git.hasStagedChanges()).toBe(true);
  });

  it("should check if has commits", async () => {
    expect(await git.hasCommits()).toBe(true);
    // Cannot test empty repo easily with TestRepo which always has initial commit
  });

  it("should set upstream", async () => {
    const remote = TestRepo.createBare();
    repo.git("remote", "add", "origin", remote);
    await git.push("origin", "main", { setUpstream: true });
    const upstream = await git.upstreamOf("main");
    expect(upstream).toBe("origin/main");
  });
});
