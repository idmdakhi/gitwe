import { describe, expect, it } from "vitest";
import { BranchName } from "../../src/domain/value-objects/branch-name.vo.js";
import { ValidationError } from "../../src/domain/errors/index.js";

describe("BranchName", () => {
  it("creates a valid branch name | accepts a simple valid name", () => {
    const name = BranchName.create("login");
    expect(name.toString()).toBe("login");
  });

  it("trims whitespace | trims surrounding whitespace", () => {
    const name = BranchName.create("  login  ");
    expect(name.toString()).toBe("login");
  });

  it("throws for empty string", () => {
    expect(() => BranchName.create("")).toThrow(ValidationError);
    expect(() => BranchName.create("   ")).toThrow(ValidationError);
  });

  it("throws for invalid characters", () => {
    const invalid = [
      "login~",
      "feat^ure",
      "branch:name",
      "branch?",
      "name*",
      "path[",
      "name\\",
      "..",
      "name.lock",
      ".hidden",
      "name/",
      "/name",
      "name//",
    ];
    for (const bad of invalid) {
      expect(() => BranchName.create(bad)).toThrow(ValidationError);
    }
  });

  it("allows valid patterns", () => {
    const valid = [
      "login",
      "feature-123",
      "bugfix/issue-42", // اجازهٔ یک اسلش
      "user-story-1234",
      "v1.2.3",
    ];
    for (const good of valid) {
      expect(() => BranchName.create(good)).not.toThrow();
    }
  });

  it("accepts names with slashes and dashes", () => {
    expect(BranchName.create("user/oauth-login").toString()).toBe("user/oauth-login");
  });

  it("rejects an empty string", () => {
    expect(() => BranchName.create("")).toThrow(ValidationError);
  });

  it("rejects a string that is only whitespace", () => {
    expect(() => BranchName.create("   ")).toThrow(ValidationError);
  });

  it("rejects names containing whitespace", () => {
    expect(() => BranchName.create("my login")).toThrow(ValidationError);
  });

  it.each(["~", "^", ":", "?", "*", "[", "\\"])("rejects names containing '%s'", (char) => {
    expect(() => BranchName.create(`login${char}`)).toThrow(ValidationError);
  });

  it("rejects names with consecutive dots", () => {
    expect(() => BranchName.create("login..bug")).toThrow(ValidationError);
  });

  it("rejects names with consecutive slashes", () => {
    expect(() => BranchName.create("login//bug")).toThrow(ValidationError);
  });

  it("rejects names with a leading slash", () => {
    expect(() => BranchName.create("/login")).toThrow(ValidationError);
  });

  it("rejects names with a trailing slash", () => {
    expect(() => BranchName.create("login/")).toThrow(ValidationError);
  });

  it("rejects names ending in .lock", () => {
    expect(() => BranchName.create("login.lock")).toThrow(ValidationError);
  });

  it("rejects names starting with a dot", () => {
    expect(() => BranchName.create(".login")).toThrow(ValidationError);
  });

  it("rejects names ending with a dot", () => {
    expect(() => BranchName.create("login.")).toThrow(ValidationError);
  });

  it("rejects names containing @{", () => {
    expect(() => BranchName.create("login@{upstream}")).toThrow(ValidationError);
  });

  it("attaches a helpful hint to the thrown error", () => {
    try {
      BranchName.create("bad name");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).hint).toMatch(/spaces/);
    }
  });
});
