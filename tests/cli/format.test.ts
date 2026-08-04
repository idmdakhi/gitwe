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
    const code = await run(argv("--cwd", repo.path, "init", "--defaults"));
    expect(code).toBe(0);
    stdout = "";
    stderr = "";
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

  it("start --format json", async () => {
    expect(await gitwe("start", "feature", "test", "--format", "json")).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.branch).toBe("feature/test");
    expect(data.startPoint).toBeDefined();
  });

  it("finish --format json", async () => {
    await gitwe("start", "feature", "test");
    repo.commit("a.txt", "a", "work");
    expect(await gitwe("finish", "feature/test", "--format", "json")).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.branch).toBe("feature/test");
    expect(data.base).toBe("develop");
  });

  it("overview --format json", async () => {
    expect(await gitwe("overview", "--format", "json")).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.workflow).toBe("classic");
    expect(data.baseBranches).toHaveLength(2);
  });

  it("overview --format yaml", async () => {
    expect(await gitwe("overview", "--format", "yaml")).toBe(0);
    expect(stdout).toContain("workflow: classic");
  });

  it("overview --format table", async () => {
    expect(await gitwe("overview", "--format", "table")).toBe(0);
    expect(stdout).toContain("Name");
    expect(stdout).toContain("Status");
  });

  it("list --format json", async () => {
    await gitwe("start", "feature", "x");
    expect(await gitwe("list", "feature", "--format", "json")).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.type).toBe("feature");
    expect(Array.isArray(data.branches)).toBe(true);
  });

  it("current --format json", async () => {
    await gitwe("start", "feature", "x");
    expect(await gitwe("current", "--format", "json")).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.branch).toBe("feature/x");
    expect(data.type).toBe("feature");
  });

  it("doctor --format json", async () => {
    expect(await gitwe("doctor", "--format", "json")).toBe(0);
    const data = JSON.parse(stdout);
    expect(Array.isArray(data.issues)).toBe(true);
  });

  it("version --format json", async () => {
    expect(await gitwe("version", "--format", "json")).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.version).toBeDefined();
    expect(data.schemaVersion).toBe(1);
  });

  it("init --dry-run", async () => {
    const other = TestRepo.create();
    try {
      expect(await run(argv("--cwd", other.path, "init", "--defaults", "--dry-run"))).toBe(0);
      expect(stdout).toContain("[dry-run]");
    } finally {
      other.destroy();
    }
  });
});
