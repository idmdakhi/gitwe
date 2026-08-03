import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { run } from "../../src/cli/program.js";
import { VERSION } from "../../src/version.js";
import { TestRepo } from "../support/repo.js";

const argv = (...args: string[]): string[] => ["node", "gitwe", ...args];

describe("gitwe CLI", () => {
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

  it("prints its version", async () => {
    expect(await gitwe("version")).toBe(0);
    expect(stdout.trim()).toBe(VERSION);
  });

  it("initialises a repository and reports its overview as JSON", async () => {
    expect(await gitwe("init", "--defaults", "--preset", "classic")).toBe(0);
    expect(existsSync(join(repo.path, "gitwe.json"))).toBe(true);
    expect(repo.branches()).toContain("develop");

    stdout = "";
    expect(await gitwe("overview", "--format", "json")).toBe(0);
    const report = JSON.parse(stdout) as {
      workflow: string;
      baseBranches: Array<{ name: string }>;
    };
    expect(report.workflow).toBe("classic");
    expect(report.baseBranches.map((b) => b.name)).toEqual(["main", "develop"]);
  });

  it("refuses to re-initialise without --force", async () => {
    await gitwe("init", "--defaults");
    expect(await gitwe("init", "--defaults")).toBe(1);
    expect(stderr).toMatch(/already exists/);
  });

  it("runs a full feature lifecycle through global shorthands", async () => {
    await gitwe("init", "--defaults");
    expect(await gitwe("start", "feature", "login")).toBe(0);
    repo.commit("a.txt", "a", "feature work");
    expect(await gitwe("finish", "feature/login")).toBe(0);
    expect(repo.branches()).not.toContain("feature/login");
    expect(repo.log("develop")).toContain("feature work");
  });

  it("edits the workflow definition through `config`", async () => {
    await gitwe("init", "--defaults");

    expect(await gitwe("config", "add", "topic", "spike", "develop", "--prefix", "spike/")).toBe(0);

    stdout = "";
    expect(await gitwe("config", "list")).toBe(0);
    expect(stdout).toContain("spike");

    expect(await gitwe("start", "spike", "idea")).toBe(0);
    expect(repo.currentBranch()).toBe("spike/idea");
  });

  it("reports unknown topic types with a hint", async () => {
    await gitwe("init", "--defaults");
    expect(await gitwe("start", "epic", "x")).toBe(1);
    expect(stderr).toMatch(/unknown topic type "epic"/);
  });
});
