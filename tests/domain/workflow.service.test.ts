import { describe, expect, it } from "vitest";
import { WorkflowService } from "../../src/domain/services/workflow.service.js";
import { classicPreset } from "../../src/infrastructure/config/presets.js";

describe("WorkflowService", () => {
  const workflow = new WorkflowService(classicPreset());

  it("finds the root base branch", () => {
    expect(workflow.rootBranch.name).toBe("main");
  });

  it("resolves a branch type by alias", () => {
    expect(workflow.requireBranchType("feat").name).toBe("feature");
  });

  it("resolves a full branch name back to type + short name", () => {
    const resolved = workflow.resolveBranch("feature/login");
    expect(resolved?.type.name).toBe("feature");
    expect(resolved?.shortName).toBe("login");
  });

  it("returns undefined for a branch that matches no prefix", () => {
    expect(workflow.resolveBranch("main")).toBeUndefined();
  });

  it("derives the tag/version-bump rule for release branches", () => {
    const release = workflow.requireBranchType("release");
    expect(workflow.shouldTag(release)).toBe(true);
    expect(workflow.versionBumpFor(release)).toBe("minor");
  });

  it("derives squash eligibility from merge.squash config", () => {
    expect(workflow.allowsSquash(workflow.requireBranchType("feature"))).toBe(true);
    expect(workflow.allowsSquash(workflow.requireBranchType("hotfix"))).toBe(false);
  });
});
