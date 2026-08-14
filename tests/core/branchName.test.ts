import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TestRepo } from "../support/repo.js";

import { assertValidBranchName, globToRegExp } from "../../src/domain/branch-name.js";
import { createPreset } from "../../src/domain/config/presets.js";
import { Workflow } from "../../src/domain/workflow.js";
import { expandCliAliases } from "../../src/cli/args.js";
import { run } from "../../src/cli/program.js";
import { stdout } from "node:process";

describe("assertValidBranchName", () => {
  it("accepts ordinary names", () => {
    expect(() => assertValidBranchName("feature/login-page")).not.toThrow();
  });

  it.each([
    "",
    "feature/..x",
    "feature/ x",
    "feature/x.lock",
    "feature//x",
    "-",
    "feature/.x",
    "x~1",
  ])("rejects %j", (name) => {
    expect(() => assertValidBranchName(name)).toThrow(/invalid branch name|empty/);
  });
});

describe("globToRegExp", () => {
  it("supports shell-style patterns", () => {
    expect(globToRegExp("user-*").test("user-auth")).toBe(true);
    expect(globToRegExp("user-*").test("admin")).toBe(false);
    expect(globToRegExp("1.?").test("1.2")).toBe(true);
    expect(globToRegExp("[ab]x").test("bx")).toBe(true);
    expect(globToRegExp("[ab]x").test("cx")).toBe(false);
  });
});

describe("branch type aliases", () => {
  const config = createPreset("classic");
  const workflow = new Workflow(config);

  const argv = (...args: string[]): string[] => ["node", "gitwe", ...args];
  let repo: TestRepo;
  beforeEach(() => {
    repo = TestRepo.create();
  });
  afterEach(() => {
    repo.destroy();
  });
  const gitwe = async (...args: string[]): Promise<number> => {
    return run(argv("--cwd", repo.path, ...args));
  };

  it("resolves branch type by canonical name", () => {
    const type = workflow.requireBranchType("feature");

    expect(type.name).toBe("feature");
  });

  it("resolves branch type by first alias", () => {
    const type = workflow.requireBranchType("feat");

    expect(type.name).toBe("feature");
  });

  it("resolves branch type by second alias", () => {
    const type = workflow.requireBranchType("ftr");

    expect(type.name).toBe("feature");
  });

  it("resolves aliases case-insensitively", () => {
    expect(workflow.requireBranchType("FEAT").name).toBe("feature");

    expect(workflow.requireBranchType("Ftr").name).toBe("feature");
  });

  it("rejects unknown branch type", () => {
    expect(() => workflow.requireBranchType("unknown")).toThrow('unknown branch type "unknown"');
  });

  it("creates the canonical branch name when using an alias", () => {
    const type = workflow.requireBranchType("feat");

    const resolved = workflow.resolveBranchType(type, "login");

    expect(resolved).toEqual({
      branch: "feature/login",
      shortName: "login",
      type,
    });
  });

  describe("CLI aliases", () => {
    const aliases = {
      fs: "finish feature",
      st: "status",
    };

    it("expands command alias", () => {
      expect(expandCliAliases(["st"], aliases)).toEqual(["status"]);
    });

    it("expands alias with arguments", () => {
      expect(expandCliAliases(["fs", "login"], aliases)).toEqual(["finish", "feature", "login"]);
    });

    it("keeps unknown command unchanged", () => {
      expect(expandCliAliases(["foo", "bar"], aliases)).toEqual(["foo", "bar"]);
    });
  });
  it("supports cli alias", async () => {
    expect(await gitwe("st")).toBe(0);

    expect(stdout).toContain("...");
  });
  it("supports finish feature alias", async () => {
    await gitwe("start", "feature", "login");

    repo.commit("test.txt", "test", "test commit");

    expect(await gitwe("fs", "login")).toBe(0);
  });
});
