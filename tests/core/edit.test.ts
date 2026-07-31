import { describe, expect, it } from "vitest";

import {
  addBaseBranch,
  addTopicType,
  deleteBaseBranch,
  deleteTopicType,
  editTopicType,
  renameBaseBranch,
} from "../../src/core/config/edit.js";
import { createPreset } from "../../src/core/config/presets.js";

describe("workflow definition editing", () => {
  const base = createPreset("github");

  it("adds a base branch", () => {
    const next = addBaseBranch(base, "staging", { parent: "main", autoUpdate: true });
    expect(next.baseBranches.map((b) => b.name)).toEqual(["main", "staging"]);
    expect(base.baseBranches).toHaveLength(1);
  });

  it("adds a topic type with defaults", () => {
    const next = addTopicType(base, "hotfix", "main", { tag: true });
    expect(next.topicTypes.at(-1)).toMatchObject({
      name: "hotfix",
      prefix: "hotfix/",
      tag: true,
      deleteOnFinish: true,
    });
  });

  it("rejects a topic type with an unknown parent", () => {
    expect(() => addTopicType(base, "hotfix", "production")).toThrow(/unknown parent branch/);
  });

  it("edits a topic type in place", () => {
    const next = editTopicType(base, "feature", { upstreamStrategy: "squash" });
    expect(next.topicTypes[0].upstreamStrategy).toBe("squash");
  });

  it("renames a base branch and updates references", () => {
    const classic = createPreset("classic");
    const next = renameBaseBranch(classic, "develop", "integration");
    expect(next.baseBranches.map((b) => b.name)).toEqual(["main", "integration"]);
    expect(next.topicTypes.find((t) => t.name === "feature")?.parent).toBe("integration");
    expect(next.topicTypes.find((t) => t.name === "release")?.startPoint).toBe("integration");
  });

  it("refuses to delete a referenced base branch", () => {
    expect(() => deleteBaseBranch(base, "main")).toThrow(/still referenced by/);
  });

  it("deletes a topic type", () => {
    const next = deleteTopicType(base, "feature");
    expect(next.topicTypes.map((t) => t.name)).toEqual(["bugfix"]);
  });
});
