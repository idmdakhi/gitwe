import { describe, expect, it } from "vitest";

import { createPreset } from "../../src/domain/config/presets.js";
import { parseWorkflowConfig } from "../../src/domain/config/parse.js";
import { ValidationError } from "../../src/domain/errors.js";
import { Workflow } from "../../src/domain/workflow.js";

describe("Workflow", () => {
  const workflow = new Workflow(createPreset("classic"));

  it("exposes the root branch", () => {
    expect(workflow.rootBranch.name).toBe("main");
  });

  it("lists auto-updating children", () => {
    expect(workflow.childrenOf("main").map((b) => b.name)).toEqual(["develop"]);
  });

  it("uses the configured start point", () => {
    expect(workflow.startPointOf(workflow.requireBranchType("release"))).toBe("develop");
    expect(workflow.startPointOf(workflow.requireBranchType("feature"))).toBe("develop");
    expect(workflow.startPointOf(workflow.requireBranchType("hotfix"))).toBe("main");
  });

  it("resolves branches by prefix", () => {
    expect(workflow.resolveBranch("feature/login")).toMatchObject({
      shortName: "login",
      type: { name: "feature" },
    });
    expect(workflow.resolveBranch("main")).toBeUndefined();
    expect(workflow.resolveBranch("feature/")).toBeUndefined();
  });

  it("prefers the longest matching prefix", () => {
    const config = parseWorkflowConfig({
      name: "custom",
      baseBranches: [{ name: "main" }],
      branchTypes: [
        { name: "feature", parent: "main", prefix: "feature/" },
        { name: "urgent", parent: "main", prefix: "feature/urgent/" },
      ],
    });
    expect(new Workflow(config).resolveBranch("feature/urgent/x")?.type.name).toBe("urgent");
  });

  it("accepts short and full names", () => {
    const type = workflow.requireBranchType("feature");
    expect(workflow.resolveBranchType(type, "login").branch).toBe("feature/login");
    expect(workflow.resolveBranchType(type, "feature/login").branch).toBe("feature/login");
  });

  it("reports unknown topic types", () => {
    expect(() => workflow.requireBranchType("epic")).toThrow(ValidationError);
  });
});
