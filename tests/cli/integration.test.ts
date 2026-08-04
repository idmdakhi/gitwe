import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../../src/cli/program.js";
import { VERSION } from "../../src/version.js";
import { TestRepo } from "../support/repo.js";

const argv = (...args: string[]): string[] => ["node", "gitwe", ...args];

describe("CLI Integration Tests", () => {
  let repo: TestRepo;
  let stdout: string;
  let stderr: string;

  beforeEach(() => {
    repo = TestRepo.create();
    stdout = "";
    stderr = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      stdout += String(chunk);
      return true;
    });
    vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      stderr += String(chunk);
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    repo.destroy();
  });

  const gitwe = async (...args: string[]): Promise<number> => {
    stdout = "";
    stderr = "";
    return run(argv("--cwd", repo.path, ...args));
  };

  it("prints version", async () => {
    expect(await gitwe("version")).toBe(0);
    expect(stdout.trim()).toBe(VERSION);
  });

  it("init and overview", async () => {
    expect(await gitwe("init", "--defaults", "--preset", "classic")).toBe(0);
    expect(existsSync(join(repo.path, "gitwe.json"))).toBe(true);
    expect(repo.branches()).toContain("develop");
    expect(await gitwe("overview")).toBe(0);
    expect(stdout).toContain("classic");
  });

  it("refuses re-init without --force", async () => {
    await gitwe("init", "--defaults");
    expect(await gitwe("init", "--defaults")).toBe(1);
    expect(stderr).toMatch(/already exists/);
  });

  it("feature lifecycle via shorthands", async () => {
    await gitwe("init", "--defaults");
    expect(await gitwe("start", "feature", "login")).toBe(0);
    expect(repo.currentBranch()).toBe("feature/login");
    repo.commit("a.txt", "a", "work");
    expect(await gitwe("finish", "feature/login")).toBe(0);
    expect(repo.branches()).not.toContain("feature/login");
  });

  it("feature lifecycle via global shorthands", async () => {
    await gitwe("init", "--defaults");
    expect(await gitwe("start", "feature", "login")).toBe(0);
    repo.commit("a.txt", "a", "work");
    expect(await gitwe("list", "feature")).toBe(0);
    expect(stdout).toContain("feature/login");
    expect(await gitwe("finish", "feature/login")).toBe(0);
    expect(repo.branches()).not.toContain("feature/login");
  });

  it("config add topic and use it", async () => {
    await gitwe("init", "--defaults");
    expect(await gitwe("config", "add", "topic", "spike", "develop", "--prefix", "spike/")).toBe(0);
    expect(await gitwe("start", "spike", "idea")).toBe(0);
    expect(repo.currentBranch()).toBe("spike/idea");
  });

  it.skip("list and filter", async () => {
    await gitwe("init", "--defaults");
    await gitwe("start", "feature", "user-auth");
    repo.commit("a.txt", "a", "work");
    repo.git("checkout", "-q", "develop");
    await gitwe("start", "feature", "user-profile");
    repo.git("checkout", "-q", "develop");
    await gitwe("start", "feature", "billing");
    expect(await gitwe("list", "feature")).toBe(0);
    expect(stdout).toContain("feature/user-auth");
  });

  it("checkout by prefix", async () => {
    await gitwe("init", "--defaults");
    await gitwe("start", "feature", "user-auth");
    repo.git("checkout", "-q", "develop");
    expect(await gitwe("checkout", "feature", "user")).toBe(0);
    expect(repo.currentBranch()).toBe("feature/user-auth");
  });

  it("current shows topic info", async () => {
    await gitwe("init", "--defaults");
    await gitwe("start", "feature", "x");
    expect(await gitwe("current")).toBe(0);
    expect(stdout).toContain("feature/x");
    expect(stdout).toContain("develop");
  });

  it("doctor reports missing base", async () => {
    await gitwe("init", "--defaults");
    repo.git("branch", "-D", "develop");
    expect(await gitwe("doctor")).toBe(0);
    expect(stdout).toMatch(/develop|missing|Issues/i);
  });

  it("validate accepts good and rejects bad config", async () => {
    await gitwe("init", "--defaults");
    expect(await gitwe("validate")).toBe(0);
    const bad = join(repo.path, "bad.json");
    writeFileSync(bad, "{}", "utf8");
    await gitwe("validate", bad);
    expect(stdout + stderr).toMatch(/invalid/i);
  });

  it("update and delete", async () => {
    await gitwe("init", "--defaults");
    await gitwe("start", "feature", "sync");
    repo.git("checkout", "-q", "develop");
    repo.commit("base.txt", "base", "parent");
    expect(await gitwe("update", "feature/sync")).toBe(0);
    expect(await gitwe("delete", "feature/sync", "--force")).toBe(0);
    expect(repo.branches()).not.toContain("feature/sync");
  });

  it("publish to remote", async () => {
    const remote = TestRepo.createBare();
    repo.git("remote", "add", "origin", remote);
    await gitwe("init", "--defaults");
    repo.git("push", "-q", "origin", "main", "develop");
    await gitwe("start", "feature", "shared");
    repo.commit("a.txt", "a", "work");
    expect(await gitwe("publish", "feature/shared")).toBe(0);
    expect(stdout).toMatch(/published|origin/);
  });

  it("dry-run init does not write", async () => {
    expect(await gitwe("init", "--defaults", "--dry-run")).toBe(0);
    expect(stdout).toContain("[dry-run]");
    expect(existsSync(join(repo.path, "gitwe.json"))).toBe(false);
  });

  it("unknown branch type reports error", async () => {
    await gitwe("init", "--defaults");
    expect(await gitwe("start", "epic", "x")).toBe(1);
    expect(stderr).toMatch(/unknown branch type/i);
  });

  it("--help shows usage", async () => {
    await gitwe("--help");
    expect(stdout + stderr).toMatch(/Usage|Commands|gitwe/i);
  });
});
