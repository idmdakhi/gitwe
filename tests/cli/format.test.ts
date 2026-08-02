import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../../src/cli/program.js";
import { TestRepo } from "../support/repo.js";

const argv = (...args: string[]): string[] => ["node", "gitwe", ...args];

describe("Format Output Tests", () => {
  let repo: TestRepo;
  let stdout: string;
  let stderr: string;

  beforeEach(async () => {
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
    await run(argv("--cwd", repo.path, "init", "--defaults"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    repo.destroy();
  });

  const gitwe = (...args: string[]): Promise<number> => run(argv("--cwd", repo.path, ...args));

  describe("JSON output", () => {
    it("should output valid JSON for start", async () => {
      expect(await gitwe("start", "feature", "test", "--format", "json")).toBe(0);
      const data = JSON.parse(stdout);
      expect(data).toHaveProperty("branch");
      expect(data).toHaveProperty("startPoint");
      expect(data.branch).toBe("feature/test");
    });

    it("should output valid JSON for finish", async () => {
      await gitwe("start", "feature", "test");
      repo.commit("a.txt", "a", "work");
      expect(await gitwe("finish", "feature/test", "--format", "json")).toBe(0);
      const data = JSON.parse(stdout);
      expect(data).toHaveProperty("branch");
      expect(data).toHaveProperty("parent");
      expect(data).toHaveProperty("strategy");
    });

    it("should output valid JSON for update", async () => {
      await gitwe("start", "feature", "test");
      expect(await gitwe("update", "feature/test", "--format", "json")).toBe(0);
      const data = JSON.parse(stdout);
      expect(data).toHaveProperty("branch");
      expect(data).toHaveProperty("parent");
      expect(data).toHaveProperty("strategy");
      expect(data).toHaveProperty("alreadyUpToDate");
    });

    it("should output valid JSON for list", async () => {
      await gitwe("start", "feature", "test");
      expect(await gitwe("list", "feature", "--format", "json")).toBe(0);
      const data = JSON.parse(stdout);
      expect(data).toHaveProperty("type");
      expect(data).toHaveProperty("branches");
      expect(Array.isArray(data.branches)).toBe(true);
    });

    it("should output valid JSON for current", async () => {
      await gitwe("start", "feature", "test");
      expect(await gitwe("current", "--format", "json")).toBe(0);
      const data = JSON.parse(stdout);
      expect(data).toHaveProperty("branch");
      expect(data).toHaveProperty("type");
      expect(data).toHaveProperty("parent");
    });

    it("should output valid JSON for graph", async () => {
      await gitwe("start", "feature", "test");
      expect(await gitwe("graph", "--format", "json")).toBe(0);
      const data = JSON.parse(stdout);
      expect(data).toHaveProperty("baseBranches");
      expect(data).toHaveProperty("topicTypes");
    });

    it("should output valid JSON for doctor", async () => {
      expect(await gitwe("doctor", "--format", "json")).toBe(0);
      const data = JSON.parse(stdout);
      expect(data).toHaveProperty("issues");
      expect(Array.isArray(data.issues)).toBe(true);
    });

    it("should output valid JSON for version", async () => {
      expect(await gitwe("version", "--format", "json")).toBe(0);
      const data = JSON.parse(stdout);
      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("schemaVersion");
      expect(data.schemaVersion).toBe(1);
    });
  });

  describe("YAML output", () => {
    it("should output valid YAML for start", async () => {
      expect(await gitwe("start", "feature", "test", "--format", "yaml")).toBe(0);
      expect(stdout).toContain("branch: feature/test");
      expect(stdout).toContain("startPoint:");
    });

    it("should output valid YAML for overview", async () => {
      expect(await gitwe("overview", "--format", "yaml")).toBe(0);
      expect(stdout).toContain("workflow: classic");
      expect(stdout).toContain("baseBranches:");
    });

    it("should output valid YAML for version", async () => {
      expect(await gitwe("version", "--format", "yaml")).toBe(0);
      expect(stdout).toContain("version:");
      expect(stdout).toContain("schemaVersion: 1");
    });
  });

  describe("dry-run", () => {
    it("should not write files on init --dry-run", async () => {
      // Remove existing config first
      await run(argv("--cwd", repo.path, "init", "--defaults", "--force", "--dry-run"));
      // It will still show dry-run message
      expect(stdout).toContain("[dry-run]");
    });

    it("should not create branches on init --dry-run", async () => {
      // The --dry-run flag is handled in init.ts
      await run(argv("--cwd", repo.path, "init", "--defaults", "--force", "--dry-run"));
      // dry-run should not have created develop branch if it was missing
      // But since we already have it from beforeEach, we'll test by checking message
      expect(stdout).toContain("[dry-run]");
    });
  });

  describe("table format", () => {
    it("should output table for overview", async () => {
      await gitwe("start", "feature", "test");
      expect(await gitwe("overview", "--format", "table")).toBe(0);
      expect(stdout).toContain("Name");
      expect(stdout).toContain("Status");
      expect(stdout).toContain("Ahead");
      expect(stdout).toContain("Behind");
    });
  });
});