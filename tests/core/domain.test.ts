// tests/core/domain.test.ts

import { describe, expect, it } from "vitest";
import {
  parseWorkflowConfig,
  createPreset,
  isPresetName,
  PRESET_NAMES,
  addBaseBranch,
  editBaseBranch,
  editBranchType,
  renameBaseBranch,
  renameBranchType,
  deleteBaseBranch,
  deleteBranchType,
  assertValidBranchName,
  globToRegExp,
  Workflow,
  addBranchType,
} from "../../src/index.js";
import { ConfigError, ValidationError } from "../../src/domain/errors.js";

describe("Domain Layer", () => {
  describe("parseWorkflowConfig", () => {
    it("should parse a minimal valid config", () => {
      const input = {
        name: "test",
        baseBranches: [{ name: "main" }],
        branchTypes: [{ name: "feature", base: "main", target: ["main"] }],
      };
      const config = parseWorkflowConfig(input);
      expect(config.version).toBe(1);
      expect(config.name).toBe("test");
      expect(config.remote?.name).toBe("origin");
      // expect(config.versioning?.tagPrefix).toBe("v");
      expect(config.baseBranches).toHaveLength(1);
      expect(config.branchTypes).toHaveLength(1);
    });

    it("should reject unsupported version", () => {
      expect(() =>
        parseWorkflowConfig({
          version: 2,
          name: "test",
          baseBranches: [{ name: "main" }],
        }),
      ).toThrow(ConfigError);
    });

    it("should reject duplicate base branch names", () => {
      expect(() =>
        parseWorkflowConfig({
          name: "test",
          baseBranches: [{ name: "main" }, { name: "main" }],
          branchTypes: [{ name: "feature", base: "main", target: ["main"] }],
        }),
      ).toThrow(/duplicate base branch/);
    });

    it("should reject unknown parent base branch", () => {
      expect(() =>
        parseWorkflowConfig({
          name: "test",
          baseBranches: [{ name: "develop", base: "unknown" }],
          branchTypes: [{ name: "feature", base: "develop", target: ["develop"] }],
        }),
      ).toThrow(/unknown base/);
    });

    it("should reject cycles in base branch tree", () => {
      expect(() =>
        parseWorkflowConfig({
          name: "test",
          baseBranches: [
            { name: "main", base: "develop" },
            { name: "develop", base: "main" },
          ],
          branchTypes: [{ name: "feature", base: "main", target: ["main"] }],
        }),
      ).toThrow(/cycle/);
    });

    it("should reject duplicate topic prefixes", () => {
      expect(() =>
        parseWorkflowConfig({
          name: "test",
          baseBranches: [{ name: "main" }],
          branchTypes: [
            { name: "feature", base: "main", prefix: "topic/", target: ["main"] },
            { name: "bugfix", base: "main", prefix: "topic/", target: ["main"] },
          ],
        }),
      ).toThrow(/share the prefix/);
    });

    it("should reject invalid merge strategies", () => {
      expect(() =>
        parseWorkflowConfig({
          name: "test",
          baseBranches: [{ name: "main" }],
          branchTypes: [{ name: "feature", base: "main", target: ["main"] }],
          merge: { strategy: "cherry-pick" },
        }),
      ).toThrow(/must be one of/);
    });

    it("should apply defaults correctly", () => {
      const config = parseWorkflowConfig({
        name: "test",
        baseBranches: [{ name: "main" }],
        branchTypes: [{ name: "feature", base: "main", target: ["main"] }],
      });
      expect(config.hooks).toEqual({ enabled: true, path: ".gitwe/hooks" });
      expect(config.merge?.strategy).toBe("merge");
      expect(config.remote?.name).toBe("origin");
      expect(config.branchTypes[0].prefix).toBe("feature/");
      expect(config.branchTypes[0].target).toEqual(["main"]);
    });
  });

  describe("createPreset", () => {
    it("should create classic preset", () => {
      const config = createPreset("classic");
      expect(config.name).toBe("classic");
      expect(config.baseBranches).toHaveLength(2);
      expect(config.baseBranches.map((b) => b.name)).toEqual(["main", "develop"]);
      expect(config.branchTypes).toHaveLength(4);
      expect(config.branchTypes.map((t) => t.name)).toEqual([
        "feature",
        "release",
        "hotfix",
        "support",
      ]);
    });

    it("should create github preset", () => {
      const config = createPreset("github");
      expect(config.name).toBe("github");
      expect(config.baseBranches).toHaveLength(1);
      expect(config.branchTypes).toHaveLength(2);
      expect(config.branchTypes.map((t) => t.name)).toEqual(["feature", "bugfix"]);
    });

    it("should create gitlab preset", () => {
      const config = createPreset("gitlab");
      expect(config.name).toBe("gitlab");
      expect(config.baseBranches).toHaveLength(3);
      expect(config.baseBranches.map((b) => b.name)).toEqual(["main", "staging", "production"]);
      expect(config.branchTypes).toHaveLength(2);
      expect(config.branchTypes.map((t) => t.name)).toEqual(["feature", "hotfix"]);
    });

    it("should apply overrides correctly", () => {
      const config = createPreset("classic", {
        main: "trunk",
        develop: "dev",
        tagPrefix: "release-",
        remoteName: "upstream",
        prefixes: {
          feature: "feat/",
          release: "rel/",
        },
        changelogEnabled: false,
      });
      expect(config.baseBranches[0].name).toBe("trunk");
      expect(config.baseBranches[1].name).toBe("dev");

      // بررسی وجود versioning و مقدار tagPrefix
      // expect(config.versioning).toBeDefined();
      // expect(config.versioning?.tagPrefix).toBe("release-");

      // بررسی وجود remote و مقدار name
      expect(config.remote).toBeDefined();
      expect(config.remote?.name).toBe("upstream");

      expect(config.branchTypes.find((t) => t.name === "feature")?.prefix).toBe("feat/");
      expect(config.branchTypes.find((t) => t.name === "release")?.prefix).toBe("rel/");
    });

    it("should validate preset name", () => {
      expect(isPresetName("classic")).toBe(true);
      expect(isPresetName("github")).toBe(true);
      expect(isPresetName("gitlab")).toBe(true);
      expect(isPresetName("invalid")).toBe(false);
    });
  });

  describe("Workflow editor", () => {
    const baseConfig = createPreset("github");

    it("should add a base branch", () => {
      const config = addBaseBranch(baseConfig, "staging", {
        base: "main",
      });
      expect(config.baseBranches).toHaveLength(2);
      expect(config.baseBranches[1].name).toBe("staging");
      expect(config.baseBranches[1].base).toBe("main");
    });

    it("should reject adding existing base branch", () => {
      expect(() => addBaseBranch(baseConfig, "main", {})).toThrow(/already exists/);
    });

    it("should edit a base branch", () => {
      let config = addBaseBranch(baseConfig, "staging", { base: "main" });
      config = editBaseBranch(config, "staging", {});
    });

    it("should rename a base branch and update references", () => {
      let config = addBaseBranch(baseConfig, "staging", { base: "main" });
      config = addBranchType(config, "release", "staging", []);
      config = renameBaseBranch(config, "staging", "release-candidate");
      expect(config.baseBranches.find((b) => b.name === "release-candidate")).toBeDefined();
      expect(config.branchTypes.find((t) => t.name === "release")?.base).toBe("release-candidate");
      expect(config.baseBranches.find((b) => b.name === "staging")).toBeUndefined();
    });

    it("should delete a base branch only if not referenced", () => {
      let config = addBaseBranch(baseConfig, "staging", { base: "main" });
      config = addBranchType(config, "release", "staging", []);
      expect(() => deleteBaseBranch(config, "staging")).toThrow(/still referenced by/);
      config = deleteBranchType(config, "release");
      config = deleteBaseBranch(config, "staging");
      expect(config.baseBranches.find((b) => b.name === "staging")).toBeUndefined();
    });

    it("should add a topic type", () => {
      const config = addBranchType(baseConfig, "hotfix", "main", [], {
        prefix: "hotfix/",
      });
      expect(config.branchTypes).toHaveLength(3);
      expect(config.branchTypes[2].name).toBe("hotfix");
      expect(config.branchTypes[2].base).toBe("main");
    });

    it("should reject adding existing topic type", () => {
      expect(() => addBranchType(baseConfig, "feature", "main", [])).toThrow(/already exists/);
    });

    it("should edit a topic type", () => {
      let config = addBranchType(baseConfig, "hotfix", "main", []);
      config = editBranchType(config, "hotfix", {
        prefix: "hot/",
      });
      const topic = config.branchTypes.find((t) => t.name === "hotfix");
      expect(topic?.prefix).toBe("hot/");
    });

    it("should rename a topic type", () => {
      let config = addBranchType(baseConfig, "hotfix", "main", []);
      config = renameBranchType(config, "hotfix", "quickfix");
      expect(config.branchTypes.find((t) => t.name === "quickfix")).toBeDefined();
      expect(config.branchTypes.find((t) => t.name === "hotfix")).toBeUndefined();
    });

    it("should delete a topic type", () => {
      let config = addBranchType(baseConfig, "hotfix", "main", []);
      config = deleteBranchType(config, "hotfix");
      expect(config.branchTypes.find((t) => t.name === "hotfix")).toBeUndefined();
    });
  });

  describe("assertValidBranchName", () => {
    it("should accept valid branch names", () => {
      expect(() => assertValidBranchName("feature/login-page")).not.toThrow();
      expect(() => assertValidBranchName("bugfix/issue-123")).not.toThrow();
      expect(() => assertValidBranchName("release/1.0.0")).not.toThrow();
    });

    it("should reject empty branch names", () => {
      expect(() => assertValidBranchName("")).toThrow(/empty/);
    });

    it("should reject invalid characters", () => {
      expect(() => assertValidBranchName("feature/ space")).toThrow(/character/);
      expect(() => assertValidBranchName("feature~")).toThrow(/character/);
      expect(() => assertValidBranchName("feature^")).toThrow(/character/);
      expect(() => assertValidBranchName("feature?")).toThrow(/character/);
      expect(() => assertValidBranchName("feature*")).toThrow(/character/);
      expect(() => assertValidBranchName("feature:")).toThrow(/character/);
    });

    it("should reject invalid sequences", () => {
      expect(() => assertValidBranchName("feature/..x")).toThrow(/\.\./);
      expect(() => assertValidBranchName("feature@{")).toThrow(/@\{/);
      expect(() => assertValidBranchName("feature//x")).toThrow(/\/\//);
      expect(() => assertValidBranchName("feature\\x")).toThrow(/\\/);
    });

    it("should reject starting or ending with slash", () => {
      expect(() => assertValidBranchName("/feature")).toThrow(/starts or ends with \//);
      expect(() => assertValidBranchName("feature/")).toThrow(/starts or ends with \//);
    });

    it("should reject starting with dash", () => {
      expect(() => assertValidBranchName("-feature")).toThrow(/starts with -/);
    });

    it("should reject ending with dot or .lock", () => {
      expect(() => assertValidBranchName("feature.")).toThrow(/ends with . or .lock/);
      expect(() => assertValidBranchName("feature.lock")).toThrow(/ends with . or .lock/);
    });

    it("should reject segments starting with dot", () => {
      expect(() => assertValidBranchName("feature/.x")).toThrow(/segment starts with ./);
    });
  });

  describe("globToRegExp", () => {
    it("should convert glob patterns to regex", () => {
      const regex = globToRegExp("user-*");
      expect(regex.test("user-auth")).toBe(true);
      expect(regex.test("admin")).toBe(false);
    });

    it("should support ? wildcard", () => {
      const regex = globToRegExp("1.?");
      expect(regex.test("1.2")).toBe(true);
      expect(regex.test("1.23")).toBe(false);
    });

    it("should support character classes", () => {
      const regex = globToRegExp("[ab]x");
      expect(regex.test("ax")).toBe(true);
      expect(regex.test("bx")).toBe(true);
      expect(regex.test("cx")).toBe(false);
    });

    it("should escape special regex characters", () => {
      const regex = globToRegExp("file+.txt");
      expect(regex.test("file+.txt")).toBe(true);
    });
  });

  describe("Workflow class", () => {
    const config = createPreset("classic");
    const workflow = new Workflow(config);

    it("should expose config properties", () => {
      expect(workflow.remoteName).toBe("origin");
      expect(workflow.baseBranches).toHaveLength(2);
      expect(workflow.branchTypes).toHaveLength(4);
    });

    it("should find root branch", () => {
      expect(workflow.rootBranch.name).toBe("main");
    });

    it("should find base branch by name", () => {
      expect(workflow.findBase("main")).toBeDefined();
      expect(workflow.findBase("unknown")).toBeUndefined();
    });

    it("should require base branch or throw", () => {
      expect(() => workflow.requireBase("main")).not.toThrow();
      expect(() => workflow.requireBase("unknown")).toThrow(/not a base branch/);
    });

    it("should find topic type by name", () => {
      expect(workflow.findBranchType("feature")).toBeDefined();
      expect(workflow.findBranchType("unknown")).toBeUndefined();
    });

    it("should require topic type or throw", () => {
      expect(() => workflow.requireBranchType("feature")).not.toThrow();
      expect(() => workflow.requireBranchType("unknown")).toThrow(/unknown branch type/);
    });

    it("should find children of a base branch", () => {
      expect(workflow.childrenOf("main").map((b) => b.name)).toEqual(["develop"]);
      expect(workflow.childrenOf("develop")).toHaveLength(0);
    });

    it("should get start point of topic type", () => {
      expect(workflow.baseOf(workflow.requireBranchType("feature"))).toBe("develop");
      expect(workflow.baseOf(workflow.requireBranchType("release"))).toBe("develop");
      expect(workflow.baseOf(workflow.requireBranchType("hotfix"))).toBe("main");
    });

    it("should get tag prefix", () => {
      expect(workflow.tagPrefixFor(workflow.requireBranchType("release"))).toBe("v");
    });

    it("should build branch name", () => {
      expect(workflow.branchName(workflow.requireBranchType("feature"), "login")).toBe(
        "feature/login",
      );
    });

    it("should resolve branch by prefix", () => {
      const resolved = workflow.resolveBranch("feature/login");
      expect(resolved).toBeDefined();
      expect(resolved?.shortName).toBe("login");
      expect(resolved?.type.name).toBe("feature");
    });

    it("should prefer longest matching prefix", () => {
      const customConfig = parseWorkflowConfig({
        name: "test",
        baseBranches: [{ name: "main" }],
        branchTypes: [
          { name: "feature", base: "main", prefix: "feature/", target: ["main"] },
          { name: "urgent", base: "main", prefix: "feature/urgent/", target: ["main"] },
        ],
      });
      const workflow2 = new Workflow(customConfig);
      const resolved = workflow2.resolveBranch("feature/urgent/x");
      expect(resolved?.type.name).toBe("urgent");
    });

    it("should resolve topic with short or full name", () => {
      const type = workflow.requireBranchType("feature");
      expect(workflow.resolveBranchType(type, "login").branch).toBe("feature/login");
      expect(workflow.resolveBranchType(type, "feature/login").branch).toBe("feature/login");
    });

    it("should check if branch is base branch", () => {
      expect(workflow.isBaseBranch("main")).toBe(true);
      expect(workflow.isBaseBranch("develop")).toBe(true);
      expect(workflow.isBaseBranch("feature/login")).toBe(false);
    });
  });
});
