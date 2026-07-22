import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkflowConfigLoader } from "#gitwe/infrastructure/config/WorkflowConfigLoader";
import { InvalidWorkflowDefinitionError } from "#gitwe/domain/errors";

const RICH_CONFIG = {
  version: 1,
  workflow: "git-flow",
  branches: {
    main: { protected: true },
    develop: { protected: true },
  },
  types: {
    feature: { prefix: "feature/", base: "develop", target: "develop", deleteAfterFinish: true },
    release: { prefix: "release/", base: "develop", target: ["main", "develop"], tag: true },
    hotfix: { prefix: "hotfix/", base: "main", target: ["main", "develop"] },
  },
  merge: { strategy: "merge", deleteSource: true },
  tag: { enabled: true, prefix: "v" },
  commit: { conventional: { enabled: true } },
  branchNaming: { case: "kebab-case", maxLength: 80 },
};

describe("WorkflowConfigLoader", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  function writeConfig(content: unknown): string {
    dir = mkdtempSync(join(tmpdir(), "gitwe-config-test-"));
    const filePath = join(dir, "gitwe.json");
    writeFileSync(filePath, JSON.stringify(content));
    return filePath;
  }

  it("loads the rich schema end to end", () => {
    const workflow = new WorkflowConfigLoader().load(writeConfig(RICH_CONFIG));

    expect(workflow.name).toBe("git-flow");
    expect(workflow.listBranchTypeNames().sort()).toEqual(["feature", "hotfix", "release"]);
    expect(workflow.isProtected("main")).toBe(true);
    expect(workflow.isProtected("develop")).toBe(true);
    expect(workflow.isProtected("feature/login")).toBe(false);
    expect(workflow.mergeStrategy).toBe("merge");
    expect(workflow.commitPolicy.enabled).toBe(true);
    expect(workflow.branchNaming.validate("fix-login-bug")).toBeUndefined();
    expect(workflow.branchNaming.validate("FixLoginBug")).toMatch(/kebab-case/);
  });

  it("normalizes a single-string target into a one-element array", () => {
    const workflow = new WorkflowConfigLoader().load(writeConfig(RICH_CONFIG));
    expect(workflow.findBranchType("feature")?.mergeTargets).toEqual(["develop"]);
  });

  it("resolves per-type tag:true against the global tag prefix", () => {
    const workflow = new WorkflowConfigLoader().load(writeConfig(RICH_CONFIG));
    const release = workflow.findBranchType("release");
    expect(release?.autoTag).toEqual({ prefix: "v" });
  });

  it("leaves non-tagging types without an autoTag", () => {
    const workflow = new WorkflowConfigLoader().load(writeConfig(RICH_CONFIG));
    expect(workflow.findBranchType("feature")?.autoTag).toBeUndefined();
    expect(workflow.findBranchType("hotfix")?.autoTag).toBeUndefined();
  });

  it("respects a global tag.enabled=false even if a type sets tag:true", () => {
    const config = { ...RICH_CONFIG, tag: { enabled: false, prefix: "v" } };
    const workflow = new WorkflowConfigLoader().load(writeConfig(config));
    expect(workflow.findBranchType("release")?.autoTag).toBeUndefined();
  });

  it("falls back to deleteAfterFinish=true by default via merge.deleteSource", () => {
    const config = {
      ...RICH_CONFIG,
      types: {
        ...RICH_CONFIG.types,
        hotfix: { prefix: "hotfix/", base: "main", target: ["main", "develop"] },
      },
    };
    const workflow = new WorkflowConfigLoader().load(writeConfig(config));
    expect(workflow.findBranchType("hotfix")?.deleteOnFinish).toBe(true);
  });

  it("supports legacy flat field names for backward compatibility", () => {
    const legacyConfig = {
      name: "legacy",
      branchTypes: [
        { name: "feature", prefix: "feature/", baseBranch: "develop", mergeTargets: ["develop"] },
      ],
    };
    const workflow = new WorkflowConfigLoader().load(writeConfig(legacyConfig));
    expect(workflow.name).toBe("legacy");
    expect(workflow.findBranchType("feature")?.baseBranch).toBe("develop");
  });

  it("rejects a config with no branch types", () => {
    expect(() =>
      new WorkflowConfigLoader().load(writeConfig({ workflow: "empty", types: {} })),
    ).toThrow(InvalidWorkflowDefinitionError);
  });

  it("rejects a branch type missing a base branch", () => {
    const config = {
      workflow: "bad",
      types: { feature: { prefix: "feature/", target: "develop" } },
    };
    expect(() => new WorkflowConfigLoader().load(writeConfig(config))).toThrow(/missing "base"/);
  });

  it("rejects a nonexistent file", () => {
    expect(() => new WorkflowConfigLoader().load("/no/such/file.json")).toThrow(
      InvalidWorkflowDefinitionError,
    );
  });
});
