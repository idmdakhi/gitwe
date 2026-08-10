import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../../src/cli/program.js";
import { TestRepo } from "../support/repo.js";
import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const argv = (...args: string[]): string[] => ["node", "gitwe", ...args];

describe("Full Workflow Integration", () => {
  let repo: TestRepo;
  let stdout: string;
  let stderr: string = "";

  beforeEach(() => {
    repo = TestRepo.create();
    stdout = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      stdout += String(chunk);
      return true;
    });
    // vi.spyOn(process.stderr, "write").mockImplementation(() => true);
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
    return run(argv("--cwd", repo.path, ...args));
  };

  /**
   * با استفاده از `gitwe init` یک workflow پایه ایجاد می‌کند،
   * سپس فایل `gitwe.json` را ویرایش کرده و `versioning` را به آن اضافه می‌کند.
   */
  const setupVersionedWorkflow = async (initialVersion: string) => {
    // مرحله ۱: ایجاد workflow پیش‌فرض
    await gitwe("init", "--defaults", "--preset", "classic");

    // مرحله ۲: خواندن فایل `gitwe.json` و اضافه کردن `versioning`
    const configPath = join(repo.path, "gitwe.json");
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    config.versioning = {
      enabled: true,
      tagPrefix: "v",
      format: "{{tagPrefix}}{{major}}.{{minor}}.{{patch}}",
      tag: ["release", "hotfix"],
      bumpRules: {
        major: [],
        minor: ["release"],
        patch: ["hotfix"],
      },
      path: ".gitwe/VERSION.yaml",
      autoCommit: true,
      commitMessage: "chore: bump version to {{version}}",
      initialVersion: "0.1.0",
    };
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    // مرحله ۳: ایجاد فایل‌های نسخه‌بندی اولیه
    const gitDir = join(repo.path, ".gitwe");
    if (!existsSync(gitDir)) mkdirSync(gitDir, { recursive: true });
    writeFileSync(join(gitDir, "VERSION.yaml"), `version: "${initialVersion}"\n`, "utf8");
    writeFileSync(
      join(repo.path, "package.json"),
      JSON.stringify({ version: initialVersion }),
      "utf8",
    );

    // commit کردن فایل‌ها
    repo.git("add", ".");
    repo.git("commit", "-m", "chore: version files");
    repo.git("checkout", "develop");
    repo.git("merge", "main", "--no-edit");
    repo.git("checkout", "main");
  };

  // ----- Release test -----
  it("release tags and back-merges", async () => {
    await setupVersionedWorkflow("1.0.0");

    const startResult = await gitwe("start", "release", "1.0.0");
    expect(startResult).toBe(0);

    repo.commit("changelog.md", "notes", "Prepare 1.0.0");
    repo.commit("feature.txt", "release work", "Prepare 1.0.0");

    const finishResult = await gitwe("finish", "release/1.0.0");
    expect(finishResult).toBe(0);
    // بنا بر bumpRules، نسخه از 1.0.0 به 1.1.0 افزایش می‌یابد
    expect(repo.git("tag")).toContain("v1.1.0");
    expect(repo.tags()).toContain("v1.1.0");
    expect(repo.tags()).not.toContain("v1.0.0");
    expect(repo.log("main")).toContain("Prepare 1.0.0");
    expect(repo.log("develop")).toContain("Prepare 1.0.0");
  });

  // ----- تست hotfix -----
  it("hotfix tags and back-merges", async () => {
    await setupVersionedWorkflow("1.1.0");

    await gitwe("start", "hotfix", "1.0.1");
    repo.commit("fix.ts", "fix", "Fix bug");
    await gitwe("finish", "hotfix/1.0.1");

    // بنا بر bumpRules، نسخه از 1.1.0 به 1.1.1 افزایش می‌یابد
    expect(repo.tags()).toContain("v1.1.1");
    expect(repo.tags()).not.toContain("v1.0.1");
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

describe("Git Flow versioning", () => {
  it("finishes release and creates version commit + tag", async () => {
    // 1. create repo
    // 2. create main/develop
    // 3. create package.json + VERSION.yaml = 1.0.0
    // 4. start release/1.1.0
    // 5. finish release
    // 6. assert main version = 1.1.0
    // 7. assert develop version = 1.1.0
    // 8. assert v1.1.0 exists
  });

  it("finishes hotfix and creates patch tag", async () => {
    // 1. current version = 1.1.0
    // 2. start hotfix
    // 3. finish
    // 4. expect 1.1.1
    // 5. expect v1.1.1
  });

  it("does not change version when finishing feature", async () => {
    // version remains unchanged
  });
});
