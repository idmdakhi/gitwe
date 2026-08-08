import { describe, expect, it } from "vitest";

import {
  addBaseBranch,
  addBranchType,
  deleteBaseBranch,
  deleteBranchType,
  editBranchType,
  renameBaseBranch,
} from "../../src/domain/config/editor.js";
import { createPreset } from "../../src/domain/config/presets.js";

describe("workflow definition editing", () => {
  const base = createPreset("github");

  it("adds a base branch", () => {
    const next = addBaseBranch(base, "staging", { base: "main" });
    expect(next.baseBranches.map((b) => b.name)).toEqual(["main", "staging"]);
    expect(base.baseBranches).toHaveLength(1);
  });

  it("adds a topic type with defaults", () => {
    // empty target array defaults to [base]
    const next = addBranchType(base, "hotfix", "main", []);
    expect(next.branchTypes.at(-1)).toMatchObject({
      name: "hotfix",
      prefix: "hotfix/",
      base: "main",
      target: [],
    });
  });

  it("rejects a topic type with an unknown parent", () => {
    expect(() => addBranchType(base, "hotfix", "production", [])).toThrow(/unknown base/);
  });

  it("edits a topic type in place", () => {
    const next = editBranchType(base, "feature", { prefix: "feat/" });
    expect(next.branchTypes[0].prefix).toBe("feat/");
  });

  it("renames a base branch and updates references", () => {
    const classic = createPreset("classic");
    const next = renameBaseBranch(classic, "develop", "integration");
    expect(next.baseBranches.map((b) => b.name)).toEqual(["main", "integration"]);
    expect(next.branchTypes.find((t) => t.name === "feature")?.base).toBe("integration");
    expect(next.branchTypes.find((t) => t.name === "release")?.base).toBe("integration");
  });

  it("refuses to delete a referenced base branch", () => {
    expect(() => deleteBaseBranch(base, "main")).toThrow(/still referenced by/);
  });

  it("deletes a topic type", () => {
    const next = deleteBranchType(base, "feature");
    expect(next.branchTypes.map((t) => t.name)).toEqual(["bugfix"]);
  });
});
