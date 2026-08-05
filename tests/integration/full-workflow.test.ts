import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../../src/cli/program.js";
import { TestRepo } from "../support/repo.js";
import { join } from "node:path";
import { writeFileSync } from "node:fs";

const argv = (...args: string[]): string[] => ["node", "gitwe", ...args];

describe("Full Workflow Integration", () => {
  let repo: TestRepo;
  let stdout: string;

  beforeEach(() => {
    repo = TestRepo.create();
    stdout = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      stdout += String(chunk);
      return true;
    });
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    repo.destroy();
  });

  const gitwe = async (...args: string[]): Promise<number> => {
    stdout = "";
    return run(argv("--cwd", repo.path, ...args));
  };

  it.skip("feature development cycle", async () => {
    expect(await gitwe("init", "--defaults")).toBe(0);
    expect(await gitwe("start", "feature", "login")).toBe(0);
    repo.write("login.ts", "export function login() {}");
    repo.commitAll("Add login");
    repo.git("checkout", "-q", "develop");
    repo.write("shared.ts", "export const v = 1;");
    repo.commitAll("shared");
    expect(await gitwe("update", "feature/login")).toBe(0);
    expect(await gitwe("finish", "feature/login")).toBe(0);
    expect(repo.branches()).not.toContain("feature/login");
    expect(repo.log("develop")).toContain("Add login");
  });

  it("release tags and back-merges", async () => {
    await gitwe("init", "--defaults");
    await gitwe("start", "release", "1.0.0");
    repo.commit("changelog.md", "notes", "Prepare 1.0.0");
    await gitwe("finish", "release/1.0.0");
    const type = repo.git("cat-file", "-t", "refs/tags/v1.0.0");
    expect(type).toBe("tag");
    expect(repo.tags()).toContain("v1.0.0");
    expect(repo.log("main")).toContain("Prepare 1.0.0");
    expect(repo.log("develop")).toContain("Prepare 1.0.0");
  });

  it("hotfix tags and back-merges", async () => {
    await gitwe("init", "--defaults");
    await gitwe("start", "hotfix", "1.0.1");
    repo.commit("fix.ts", "fix", "Fix bug");
    await gitwe("finish", "hotfix/1.0.1");
    expect(repo.tags()).toContain("v1.0.1");
    expect(repo.log("develop")).toContain("Fix bug");
  });

  it.skip("conflict continue", async () => {
    await gitwe("init", "--defaults");
    await gitwe("start", "feature", "conflict");
    repo.write("shared.txt", "feature");
    repo.commitAll("Feature");
    repo.git("checkout", "-q", "develop");
    repo.write("shared.txt", "develop");
    repo.commitAll("Develop");
    const conflictCode = await gitwe("finish", "feature/conflict");
    expect([1, 2]).toContain(conflictCode);
    repo.write("shared.txt", "resolved");
    repo.git("add", "shared.txt");
    expect(await gitwe("finish", "--continue")).toBe(0);
    expect(repo.git("show", "develop:shared.txt")).toBe("resolved");
  });

  it("custom workflow config", async () => {
    const custom = {
      version: 1,
      name: "custom",
      remote: "origin",
      tagPrefix: "v",
      baseBranches: [{ name: "main" }, { name: "staging", base: "main" }],
      branchTypes: [
        {
          name: "feature",
          base: "staging",
          prefix: "feat/",
          target: "staging",
        },
      ],
      hooks: { enabled: true, path: ".gitwe/hooks" },
    };
    writeFileSync(join(repo.path, "custom.json"), JSON.stringify(custom, null, 2));
    repo.git("branch", "staging", "main");
    expect(await gitwe("--config", "custom.json", "start", "feature", "test")).toBe(0);
    expect(repo.currentBranch()).toBe("feat/test");
    repo.commit("a.txt", "a", "work");
    expect(await gitwe("--config", "custom.json", "finish", "feat/test")).toBe(0);
    expect(repo.log("staging")).toContain("work");
  });

  it("list filter and rename", async () => {
    await gitwe("init", "--defaults");
    await gitwe("start", "feature", "user-auth");
    repo.git("checkout", "-q", "develop");
    await gitwe("start", "feature", "user-profile");
    expect(await gitwe("list", "feature", "user-*")).toBe(0);
    expect(stdout).toContain("feature/user-auth");
    repo.git("checkout", "-q", "feature/user-auth");
    expect(await gitwe("rename", "auth")).toBe(0);
    expect(repo.branches()).toContain("feature/auth");
  });

  it("json outputs for main commands", async () => {
    await gitwe("init", "--defaults");
    for (const cmd of [
      ["start", "feature", "j", "--format", "json"],
      ["list", "feature", "--format", "json"],
      ["overview", "--format", "json"],
      ["doctor", "--format", "json"],
      ["version", "--format", "json"],
    ]) {
      expect(await gitwe(...cmd)).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    }
  });
});
