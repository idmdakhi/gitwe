import { describe, expect, it } from "vitest";
import { ConfigEditorService } from "../../src/domain/services/config-editor.service.js";
import { classicPreset } from "../../src/domain/config/presets.js";
import { ValidationError } from "../../src/domain/errors/index.js";

describe("ConfigEditorService", () => {
  const editor = new ConfigEditorService();

  it("adds a base branch", () => {
    const config = classicPreset();
    const updated = editor.addBase(config, "staging", { base: "develop" });
    expect(updated.baseBranches).toHaveLength(3);
    expect(updated.baseBranches.find((b) => b.name === "staging")).toBeDefined();
    expect(updated.baseBranches.find((b) => b.name === "staging")?.base).toBe("develop");
  });

  it("throws when adding a duplicate base branch", () => {
    const config = classicPreset();
    expect(() => editor.addBase(config, "main")).toThrow(ValidationError);
  });

  it("adds a branch type", () => {
    const config = classicPreset();
    const updated = editor.addBranchType(config, "experiment", {
      base: "develop",
      target: ["develop"],
      prefix: "exp/",
    });
    expect(updated.branchTypes).toHaveLength(5);
    expect(updated.branchTypes.find((t) => t.name === "experiment")).toBeDefined();
  });

  it("edits a base branch", () => {
    const config = classicPreset();
    const updated = editor.editBase(config, "develop", { protected: true, aliases: ["dev"] });
    const dev = updated.baseBranches.find((b) => b.name === "develop")!;
    expect(dev.protected).toBe(true);
    expect(dev.aliases).toEqual(["dev"]);
  });

  it("renames a base branch and updates references", () => {
    const config = classicPreset();
    const updated = editor.renameBase(config, "develop", "dev");
    expect(updated.baseBranches.some((b) => b.name === "develop")).toBe(false);
    expect(updated.baseBranches.some((b) => b.name === "dev")).toBe(true);
    // بررسی اینکه branch type‌ها به‌روز شده‌اند
    const feature = updated.branchTypes.find((t) => t.name === "feature")!;
    expect(feature.base).toBe("dev");
  });

  it("deletes a branch type and cleans up merge config", () => {
    const config = classicPreset();
    const updated = editor.deleteBranchType(config, "feature");
    expect(updated.branchTypes.some((t) => t.name === "feature")).toBe(false);
    // مطمئن می‌شویم که در deleteOnFinish حذف شده
    expect(updated.merge?.deleteOnFinish).not.toContain("feature");
    // و در squash.branchTypes
    expect(updated.merge?.squash?.branchTypes).not.toContain("feature");
  });
});
