import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { run } from "../../src/cli/program.js";
import { TestRepo } from "../support/repo.js";
import { join } from "node:path";
import { writeFileSync } from "node:fs";

const argv = (...args: string[]): string[] => ["node", "gitwe", ...args];

describe("Full Workflow Integration", () => {
  let repo: TestRepo;
  let stdout: string;
  let ـstderr: string;

  beforeEach(() => {
    repo = TestRepo.create();
    stdout = "";
    ـstderr = "";
    // We'll capture output in tests manually
  });

  afterEach(() => {
    repo.destroy();
  });

  const gitwe = (...args: string[]): Promise<number> => run(argv("--cwd", repo.path, ...args));

  it("should complete a full feature development cycle", async () => {
    // 1. Initialize
    expect(await gitwe("init", "--defaults", "--preset", "classic")).toBe(0);

    // 2. Start feature
    expect(await gitwe("start", "feature", "login")).toBe(0);
    expect(repo.currentBranch()).toBe("feature/login");

    // 3. Make changes
    repo.write("login.ts", "export function login() {}");
    repo.commitAll("Add login function");
    repo.write("login.test.ts", "test('login works', () => {})");
    repo.commitAll("Add login tests");

    // 4. Update from develop
    repo.git("checkout", "-q", "develop");
    repo.write("shared.ts", "export const version = '1.0.0';");
    repo.commitAll("Update shared module");
    expect(await gitwe("update", "feature/login")).toBe(0);

    // 5. Check status
    expect(await gitwe("current")).toBe(0);
    expect(stdout).toContain("feature/login");

    // 6. Finish feature
    expect(await gitwe("finish", "feature/login", "--push")).toBe(0);

    // 7. Verify branch deleted and changes merged
    expect(repo.branches()).not.toContain("feature/login");
    expect(repo.currentBranch()).toBe("develop");
    expect(repo.log("develop")).toContain("Add login function");
  });

  it("should handle release workflow", async () => {
    await gitwe("init", "--defaults");

    // Start release
    await gitwe("start", "release", "1.0.0");
    repo.commit("changelog.md", "Release notes", "Prepare 1.0.0");

    // Finish release
    await gitwe("finish", "release/1.0.0", "--push");

    // Verify tag created and develop updated
    expect(repo.tags()).toContain("v1.0.0");
    expect(repo.log("main")).toContain("Prepare 1.0.0");
    expect(repo.log("develop")).toContain("Prepare 1.0.0");
  });

  it("should handle hotfix workflow", async () => {
    await gitwe("init", "--defaults");

    // Simulate a bug in production
    await gitwe("start", "hotfix", "1.0.1");
    repo.write("fix.ts", "export function fix() {}");
    repo.commitAll("Fix critical bug");

    // Finish hotfix
    await gitwe("finish", "hotfix/1.0.1", "--push");

    // Verify tag created and develop updated
    expect(repo.tags()).toContain("v1.0.1");
    expect(repo.log("main")).toContain("Fix critical bug");
    expect(repo.log("develop")).toContain("Fix critical bug");
  });

  it("should handle conflict resolution with --continue", async () => {
    await gitwe("init", "--defaults");

    // Create conflicting changes
    await gitwe("start", "feature", "conflict");
    repo.write("shared.txt", "feature version");
    repo.commitAll("Feature change");

    repo.git("checkout", "-q", "develop");
    repo.write("shared.txt", "develop version");
    repo.commitAll("Develop change");

    // Try to finish - should fail with conflict
    const result = await gitwe("finish", "feature/conflict");
    expect(result).toBe(2); // Exit code 2 for conflict

    // Resolve conflict
    repo.write("shared.txt", "resolved version");
    repo.git("add", "shared.txt");

    // Continue
    expect(await gitwe("finish", "--continue")).toBe(0);
    expect(repo.branches()).not.toContain("feature/conflict");
    expect(repo.git("show", "develop:shared.txt")).toBe("resolved version");
  });

  it("should support custom workflow definition", async () => {
    // Create custom workflow
    const customConfig = {
      version: 1,
      name: "custom",
      remote: "origin",
      tagPrefix: "v",
      baseBranches: [{ name: "main" }, { name: "staging", parent: "main", autoUpdate: true }],
      topicTypes: [
        {
          name: "feature",
          parent: "staging",
          prefix: "feat/",
          upstreamStrategy: "merge",
          downstreamStrategy: "merge",
          tag: false,
          deleteOnFinish: true,
        },
      ],
      hooks: { enabled: true, path: ".gitwe/hooks" },
    };

    const configPath = join(repo.path, "custom.json");
    writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

    // Use custom config
    expect(await gitwe("--config", "custom.json", "init", "--defaults")).toBe(0);

    // Start feature with custom prefix
    expect(await gitwe("start", "feature", "test")).toBe(0);
    expect(repo.currentBranch()).toBe("feat/test");

    // Finish feature
    await repo.commit("a.txt", "a", "feature work");
    expect(await gitwe("finish", "feat/test")).toBe(0);
    expect(repo.currentBranch()).toBe("staging");
    expect(repo.log("staging")).toContain("feature work");
  });

  it("should handle multi-remote scenario", async () => {
    const remote1 = TestRepo.createBare();
    const remote2 = TestRepo.createBare();

    repo.git("remote", "add", "origin", remote1);
    repo.git("remote", "add", "backup", remote2);
    repo.git("push", "-q", "origin", "main", "develop");
    repo.git("push", "-q", "backup", "main", "develop");

    await gitwe("init", "--defaults");

    // Publish to origin (default remote)
    await gitwe("start", "feature", "shared");
    await repo.commit("a.txt", "a", "work");
    await gitwe("publish", "feature/shared");

    // Verify branch exists on both remotes
    expect(repo.git("ls-remote", "--heads", "origin", "feature/shared")).not.toBe("");
    expect(repo.git("ls-remote", "--heads", "backup", "feature/shared")).not.toBe("");

    // Finish with push
    await gitwe("finish", "feature/shared", "--push");
    expect(repo.git("ls-remote", "--heads", "origin", "feature/shared")).toBe("");
    expect(repo.git("ls-remote", "--heads", "backup", "feature/shared")).toBe("");
  });

  it("should handle doctor and validation", async () => {
    await gitwe("init", "--defaults");

    // Create a broken state
    repo.git("branch", "-D", "develop");

    // Doctor should report issues
    await gitwe("doctor");
    expect(stdout).toContain('base branch "develop" is missing');

    // Validate config
    expect(await gitwe("validate")).toBe(0);
    expect(stdout).toContain("is a valid workflow definition");

    // Fix with init --force should recreate missing branches
    await gitwe("init", "--force", "--defaults");
    expect(repo.branches()).toContain("develop");
  });

  it("should support list with filtering", async () => {
    await gitwe("init", "--defaults");

    // Create multiple branches
    await gitwe("start", "feature", "user-auth");
    await repo.commit("a.txt", "a", "auth");
    await gitwe("start", "feature", "user-profile");
    await repo.commit("b.txt", "b", "profile");
    await gitwe("start", "feature", "billing");
    await repo.commit("c.txt", "c", "billing");
    await gitwe("start", "feature", "api-auth");
    await repo.commit("d.txt", "d", "api-auth");

    // List all
    await gitwe("list", "feature");
    expect(stdout).toContain("feature/user-auth");
    expect(stdout).toContain("feature/user-profile");
    expect(stdout).toContain("feature/billing");
    expect(stdout).toContain("feature/api-auth");

    // Filter with glob
    await gitwe("list", "feature", "user-*");
    expect(stdout).toContain("feature/user-auth");
    expect(stdout).toContain("feature/user-profile");
    expect(stdout).not.toContain("feature/billing");

    // Filter with character class
    await gitwe("list", "feature", "[ab]*");
    expect(stdout).toContain("feature/api-auth");
    expect(stdout).toContain("feature/billing");
    expect(stdout).not.toContain("feature/user-auth");
  });

  it("should handle checkout with unique prefix", async () => {
    await gitwe("init", "--defaults");
    await gitwe("start", "feature", "long-branch-name");
    await repo.commit("a.txt", "a", "work");
    await gitwe("checkout", "feature", "long");
    // Should switch back to long-branch-name
    expect(repo.currentBranch()).toBe("feature/long-branch-name");
  });

  it("should handle rename", async () => {
    await gitwe("init", "--defaults");
    await gitwe("start", "feature", "old-name");
    await gitwe("rename", "feature/old-name", "new-name");
    expect(repo.branches()).toContain("feature/new-name");
    expect(repo.branches()).not.toContain("feature/old-name");
  });

  it("should handle delete with remote", async () => {
    const remote = TestRepo.createBare();
    repo.git("remote", "add", "origin", remote);
    repo.git("push", "-q", "origin", "main", "develop");

    await gitwe("init", "--defaults");
    await gitwe("start", "feature", "shared");
    await repo.commit("a.txt", "a", "work");
    await gitwe("publish", "feature/shared");

    // Delete with remote
    await gitwe("delete", "feature/shared", "--remote");
    expect(repo.branches()).not.toContain("feature/shared");
    expect(repo.git("ls-remote", "--heads", "origin", "feature/shared")).toBe("");
  });

  it("should output JSON for all commands", async () => {
    await gitwe("init", "--defaults");

    // Test each command with --format json
    const commands = [
      ["start", "feature", "json-test", "--format", "json"],
      ["list", "feature", "--format", "json"],
      ["current", "--format", "json"],
      ["overview", "--format", "json"],
      ["doctor", "--format", "json"],
      ["graph", "--format", "json"],
      ["version", "--format", "json"],
    ];

    for (const cmd of commands) {
      stdout = "";
      const result = await gitwe(...cmd);
      expect(result).toBe(0);
      try {
        const data = JSON.parse(stdout);
        expect(data).toBeDefined();
      } catch {
        throw new Error(`Failed to parse JSON for command: ${cmd.join(" ")}`);
      }
    }
  });

  it("should handle dry-run for destructive operations", async () => {
    await gitwe("init", "--defaults");
    await gitwe("start", "feature", "test", "--dry-run");
    // Should not create branch
    expect(repo.branches()).not.toContain("feature/test");

    // Finish dry-run
    await gitwe("finish", "feature/test", "--dry-run");
    // Should not delete branch (it doesn't exist anyway)
  });

  it("should handle large number of branches efficiently", async () => {
    await gitwe("init", "--defaults");

    // Create 20 branches
    for (let i = 0; i < 20; i++) {
      await gitwe("start", "feature", `branch-${i}`);
      await repo.commit(`${i}.txt`, `${i}`, `branch ${i}`);
      await gitwe("checkout", "feature", "develop");
    }

    // List should handle it
    const start = Date.now();
    await gitwe("list", "feature");
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000); // Should complete in 5 seconds
    expect(stdout).toContain("feature/branch-0");
    expect(stdout).toContain("feature/branch-19");
  });
});
