import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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

  const gitwe = (...args: string[]): Promise<number> => run(argv("--cwd", repo.path, ...args));

  describe("core commands", () => {
    it("should print version", async () => {
      expect(await gitwe("version")).toBe(0);
      expect(stdout.trim()).toBe(VERSION);
    });

    it("should init a repository", async () => {
      expect(await gitwe("init", "--defaults", "--preset", "classic")).toBe(0);
      expect(existsSync(join(repo.path, "gitwe.json"))).toBe(true);
      expect(repo.branches()).toContain("develop");
    });

    it("should refuse to re-init without --force", async () => {
      await gitwe("init", "--defaults");
      expect(await gitwe("init", "--defaults")).toBe(1);
      expect(stderr).toMatch(/already exists/);
    });

    it("should show overview", async () => {
      await gitwe("init", "--defaults");
      expect(await gitwe("overview")).toBe(0);
      expect(stdout).toContain("Workflow");
      expect(stdout).toContain("classic");
      expect(stdout).toContain("Base branches");
    });

    it("should show overview in JSON format", async () => {
      await gitwe("init", "--defaults");
      expect(await gitwe("overview", "--format", "json")).toBe(0);
      const report = JSON.parse(stdout);
      expect(report.workflow).toBe("classic");
      expect(report.baseBranches).toHaveLength(2);
    });

    it("should show overview in YAML format", async () => {
      await gitwe("init", "--defaults");
      expect(await gitwe("overview", "--format", "yaml")).toBe(0);
      expect(stdout).toContain("workflow: classic");
    });

    it("should show overview in table format", async () => {
      await gitwe("init", "--defaults");
      expect(await gitwe("overview", "--format", "table")).toBe(0);
      expect(stdout).toContain("Name");
      expect(stdout).toContain("Status");
      expect(stdout).toContain("Ahead");
      expect(stdout).toContain("Behind");
      expect(stdout).toContain("Upstream");
    });
  });

  describe("config commands", () => {
    beforeEach(async () => {
      await gitwe("init", "--defaults");
    });

    it("should list config", async () => {
      expect(await gitwe("config", "list")).toBe(0);
      expect(stdout).toContain("Workflow");
      expect(stdout).toContain("classic");
      expect(stdout).toContain("Base branches");
      expect(stdout).toContain("Topic types");
    });

    it("should add a topic type", async () => {
      expect(await gitwe("config", "add", "topic", "spike", "develop", "--prefix", "spike/")).toBe(
        0,
      );
      expect(stdout).toContain("updated");
      expect(await gitwe("config", "list")).toBe(0);
      expect(stdout).toContain("spike");
    });

    it("should edit a topic type", async () => {
      expect(
        await gitwe("config", "edit", "topic", "feature", "--upstream-strategy", "squash", "--tag"),
      ).toBe(0);
      expect(await gitwe("config", "list")).toBe(0);
      expect(stdout).toContain("upstream=squash");
      expect(stdout).toContain("tag=true");
    });

    it("should rename a topic type", async () => {
      expect(await gitwe("config", "rename", "topic", "feature", "feat")).toBe(0);
      expect(await gitwe("config", "list")).toBe(0);
      expect(stdout).toContain("feat");
      expect(stdout).not.toContain("feature");
    });

    it("should delete a topic type", async () => {
      expect(await gitwe("config", "delete", "topic", "support")).toBe(0);
      expect(await gitwe("config", "list")).toBe(0);
      expect(stdout).not.toContain("support");
    });

    it("should add a base branch", async () => {
      expect(
        await gitwe("config", "add", "base", "staging", "--parent", "main", "--auto-update"),
      ).toBe(0);
      expect(await gitwe("config", "list")).toBe(0);
      expect(stdout).toContain("staging");
    });
  });

  describe("workflow commands", () => {
    beforeEach(async () => {
      await gitwe("init", "--defaults");
    });

    it("should start a feature branch", async () => {
      expect(await gitwe("start", "feature", "login")).toBe(0);
      expect(stdout).toContain("created feature/login");
      expect(repo.currentBranch()).toBe("feature/login");
    });

    it("should finish a feature branch", async () => {
      await gitwe("start", "feature", "login");
      repo.commit("a.txt", "a", "feature work");
      expect(await gitwe("finish", "feature/login")).toBe(0);
      expect(stdout).toContain("feature/login → develop");
      expect(repo.branches()).not.toContain("feature/login");
    });

    it("should update a topic branch", async () => {
      await gitwe("start", "feature", "sync");
      repo.git("checkout", "-q", "develop");
      repo.commit("base.txt", "base", "parent commit");
      expect(await gitwe("update", "feature/sync")).toBe(0);
      expect(stdout).toContain("updated feature/sync");
      expect(repo.currentBranch()).toBe("feature/sync");
    });

    it("should rebase a topic branch", async () => {
      await gitwe("start", "feature", "rebase-me");
      repo.commit("topic.txt", "topic", "topic commit");
      repo.git("checkout", "-q", "develop");
      repo.commit("base.txt", "base", "parent commit");
      expect(await gitwe("rebase", "feature/rebase-me")).toBe(0);
      expect(stdout).toContain("rebased feature/rebase-me onto develop");
    });

    it("should publish a topic branch", async () => {
      const remote = TestRepo.createBare();
      repo.git("remote", "add", "origin", remote);
      repo.git("push", "-q", "origin", "main", "develop");
      await gitwe("start", "feature", "shared");
      repo.commit("a.txt", "a", "shared work");
      expect(await gitwe("publish", "feature/shared")).toBe(0);
      expect(stdout).toContain("published origin/feature/shared");
    });

    it("should delete a topic branch", async () => {
      await gitwe("start", "feature", "doomed");
      expect(await gitwe("delete", "feature/doomed", "--force")).toBe(0);
      expect(stdout).toContain("deleted feature/doomed");
      expect(repo.branches()).not.toContain("feature/doomed");
    });

    it("should rename a topic branch", async () => {
      await gitwe("start", "feature", "old");
      expect(await gitwe("rename", "feature/old", "new")).toBe(0);
      expect(stdout).toContain("renamed feature/old → feature/new");
      expect(repo.branches()).toContain("feature/new");
    });
  });

  describe("list command", () => {
    beforeEach(async () => {
      await gitwe("init", "--defaults");
      await gitwe("start", "feature", "user-auth");
      repo.commit("a.txt", "a", "work");
      await gitwe("start", "feature", "user-profile");
      await gitwe("start", "feature", "billing");
    });

    it("should list all feature branches", async () => {
      expect(await gitwe("list", "feature")).toBe(0);
      expect(stdout).toContain("feature/billing");
      expect(stdout).toContain("feature/user-auth");
      expect(stdout).toContain("feature/user-profile");
    });

    it("should list filtered branches", async () => {
      expect(await gitwe("list", "feature", "user-*")).toBe(0);
      expect(stdout).toContain("feature/user-auth");
      expect(stdout).toContain("feature/user-profile");
      expect(stdout).not.toContain("feature/billing");
    });

    it("should show no branches message", async () => {
      expect(await gitwe("list", "release")).toBe(0);
      expect(stdout).toContain("no release branches");
    });
  });

  describe("checkout command", () => {
    beforeEach(async () => {
      await gitwe("init", "--defaults");
      await gitwe("start", "feature", "user-auth");
      repo.git("checkout", "-q", "develop");
    });

    it("should checkout by unique prefix", async () => {
      expect(await gitwe("checkout", "feature", "user")).toBe(0);
      expect(stdout).toContain("switched to feature/user-auth");
      expect(repo.currentBranch()).toBe("feature/user-auth");
    });

    it("should checkout exact name", async () => {
      expect(await gitwe("checkout", "feature", "user-auth")).toBe(0);
      expect(repo.currentBranch()).toBe("feature/user-auth");
    });
  });

  describe("current command", () => {
    it("should show current topic branch", async () => {
      await gitwe("init", "--defaults");
      await gitwe("start", "feature", "current");
      expect(await gitwe("current")).toBe(0);
      expect(stdout).toContain("Branch:");
      expect(stdout).toContain("feature/current");
      expect(stdout).toContain("Type:");
      expect(stdout).toContain("feature");
      expect(stdout).toContain("Parent:");
      expect(stdout).toContain("develop");
    });

    it("should show current in JSON format", async () => {
      await gitwe("init", "--defaults");
      await gitwe("start", "feature", "current");
      expect(await gitwe("current", "--format", "json")).toBe(0);
      const data = JSON.parse(stdout);
      expect(data.branch).toBe("feature/current");
      expect(data.type).toBe("feature");
      expect(data.parent).toBe("develop");
    });
  });

  describe("graph command", () => {
    beforeEach(async () => {
      await gitwe("init", "--defaults");
      await gitwe("start", "feature", "login");
      repo.commit("a.txt", "a", "work");
    });

    it("should show branch graph", async () => {
      expect(await gitwe("graph")).toBe(0);
      expect(stdout).toContain("Base branches:");
      expect(stdout).toContain("main");
      expect(stdout).toContain("develop");
      expect(stdout).toContain("Topic branches:");
      expect(stdout).toContain("feature");
      expect(stdout).toContain("feature/login");
    });

    it("should show graph in JSON format", async () => {
      expect(await gitwe("graph", "--format", "json")).toBe(0);
      const data = JSON.parse(stdout);
      expect(data.baseBranches).toBeDefined();
      expect(data.topicTypes).toBeDefined();
      expect(data.topicTypes[0].branches).toContain("feature/login");
    });
  });

  describe("doctor command", () => {
    beforeEach(async () => {
      await gitwe("init", "--defaults");
    });

    it("should report healthy repository", async () => {
      expect(await gitwe("doctor")).toBe(0);
      expect(stdout).toContain("✓ Repository is healthy.");
    });

    it("should report issues", async () => {
      repo.git("branch", "-D", "develop");
      expect(await gitwe("doctor")).toBe(0);
      expect(stdout).toContain("Issues found:");
      expect(stdout).toContain('base branch "develop" is missing');
    });

    it("should show --fix placeholder", async () => {
      repo.git("branch", "-D", "develop");
      expect(await gitwe("doctor", "--fix", "--yes")).toBe(0);
      expect(stdout).toContain("--fix is not yet fully implemented");
    });

    it("should require --yes for --fix", async () => {
      repo.git("branch", "-D", "develop");
      expect(await gitwe("doctor", "--fix")).toBe(0);
      expect(stdout).toContain("--fix requires --yes to proceed");
    });
  });

  describe("validate command", () => {
    it("should validate existing config", async () => {
      await gitwe("init", "--defaults");
      expect(await gitwe("validate")).toBe(0);
      expect(stdout).toContain("is a valid workflow definition");
    });

    it("should validate specified file", async () => {
      await gitwe("init", "--defaults");
      const filePath = join(repo.path, "gitwe.json");
      expect(await gitwe("validate", filePath)).toBe(0);
      expect(stdout).toContain("is a valid workflow definition");
    });

    it("should reject invalid config", async () => {
      const filePath = join(repo.path, "invalid.json");
      writeFileSync(filePath, "{}", "utf8");
      expect(await gitwe("validate", filePath)).toBe(1);
      expect(stdout).toContain("is invalid:");
    });

    it("should show validation in JSON format", async () => {
      await gitwe("init", "--defaults");
      expect(await gitwe("validate", "--format", "json")).toBe(0);
      const data = JSON.parse(stdout);
      expect(data.valid).toBe(true);
      expect(data.workflow).toBe("classic");
    });
  });

  describe("global options", () => {
    it("should support --dry-run for init", async () => {
      expect(await gitwe("init", "--defaults", "--dry-run")).toBe(0);
      expect(stdout).toContain("[dry-run]");
      expect(existsSync(join(repo.path, "gitwe.json"))).toBe(false);
    });

    it("should support --dry-run for start", async () => {
      await gitwe("init", "--defaults");
      // Dry-run for start is not yet fully implemented in CLI
      // This test verifies the flag is accepted
      expect(await gitwe("start", "feature", "test", "--dry-run")).toBe(0);
    });

    it("should support --verbose flag", async () => {
      await gitwe("init", "--defaults");
      expect(await gitwe("overview", "--verbose")).toBe(0);
      // Verbose flag should not cause errors
      expect(stdout).toContain("Workflow");
    });

    it("should support --no-color flag", async () => {
      await gitwe("init", "--defaults");
      expect(await gitwe("overview", "--no-color")).toBe(0);
      // Should not contain ANSI escape codes
      expect(stdout).not.toContain("\u001B");
    });

    it("should support --config flag", async () => {
      await gitwe("init", "--defaults", "--file", "custom.json");
      const configPath = join(repo.path, "custom.json");
      expect(existsSync(configPath)).toBe(true);
      expect(await gitwe("--config", "custom.json", "overview")).toBe(0);
      expect(stdout).toContain("custom.json");
    });

    it("should support GITWE_CONFIG environment variable", async () => {
      await gitwe("init", "--defaults", "--file", "custom.json");
      process.env.GITWE_CONFIG = "custom.json";
      try {
        expect(await gitwe("overview")).toBe(0);
        expect(stdout).toContain("custom.json");
      } finally {
        delete process.env.GITWE_CONFIG;
      }
    });
  });

  describe("track command", () => {
    let remote: string;

    beforeEach(async () => {
      remote = TestRepo.createBare();
      repo.git("remote", "add", "origin", remote);
      repo.git("push", "-q", "origin", "main", "develop");
      await gitwe("init", "--defaults");
      await gitwe("start", "feature", "shared");
      repo.commit("a.txt", "a", "shared work");
      await gitwe("publish", "feature/shared");
    });

    it("should track a remote branch", async () => {
      const other = TestRepo.create();
      other.git("remote", "add", "origin", remote);
      other.git("fetch", "-q", "origin");
      // Run gitwe from the other repo
      const otherOut = await run(argv("--cwd", other.path, "init", "--defaults"));
      expect(otherOut).toBe(0);
      const trackOut = await run(argv("--cwd", other.path, "track", "feature", "shared"));
      expect(trackOut).toBe(0);
      expect(stdout).toContain("tracking feature/shared");
      expect(other.currentBranch()).toBe("feature/shared");
      other.destroy();
    });
  });

  describe("help commands", () => {
    it("should show help for init", async () => {
      expect(await gitwe("init", "help")).toBe(0);
      expect(stdout).toContain("Usage:");
      expect(stdout).toContain("init");
    });

    it("should show help for config", async () => {
      expect(await gitwe("config", "help")).toBe(0);
      expect(stdout).toContain("Usage:");
      expect(stdout).toContain("config");
    });

    it("should show help for start", async () => {
      await gitwe("init", "--defaults");
      expect(await gitwe("start", "help")).toBe(0);
      expect(stdout).toContain("Usage:");
      expect(stdout).toContain("start");
    });

    it("should show help for finish", async () => {
      await gitwe("init", "--defaults");
      expect(await gitwe("finish", "help")).toBe(0);
      expect(stdout).toContain("Usage:");
      expect(stdout).toContain("finish");
    });
  });
  // داخل describe('CLI Integration Tests')
  describe("config command", () => {
    it("should edit base branch with --parent, --upstream-strategy, etc.", async () => {
      await gitwe("init", "--defaults");
      await gitwe("config", "add", "base", "staging", "--parent", "main");
      await gitwe(
        "config",
        "edit",
        "base",
        "staging",
        "--parent",
        "develop",
        "--upstream-strategy",
        "squash",
      );
      const out = await gitwe("config", "list");
      // Check that staging is under develop and upstream=squash
      // We'll parse the output or just check for strings
      expect(stdout).toContain("staging");
      expect(stdout).toContain("parent=develop");
      expect(stdout).toContain("upstream=squash");
    });

    it("should add topic with --tag and --keep", async () => {
      await gitwe("init", "--defaults");
      await gitwe("config", "add", "topic", "spike", "develop", "--tag", "--keep");
      // Check list output
      await gitwe("config", "list");
      expect(stdout).toContain("spike");
      expect(stdout).toContain("tag=true");
      expect(stdout).toContain("delete-on-finish=false");
    });
  });

  describe("validate command", () => {
    it("should validate YAML config", async () => {
      // Write a YAML config
      const yaml = `
version: 1
name: test
baseBranches:
  - name: main
topicTypes:
  - name: feature
    parent: main
`;
      const filePath = join(repo.path, "gitwe.yaml");
      writeFileSync(filePath, yaml);
      await gitwe("validate", "gitwe.yaml");
      expect(stdout).toContain("is a valid workflow definition");
    });

    it("should reject invalid config", async () => {
      const filePath = join(repo.path, "invalid.json");
      writeFileSync(filePath, '{"baseBranches": []}'); // missing name
      await gitwe("validate", "invalid.json");
      // Should exit with non-zero
      // We'll check stderr for error
      expect(stderr).toContain("is invalid:");
    });
  });
});
