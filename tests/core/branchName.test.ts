import { describe, expect, it } from "vitest";

import { assertValidBranchName, globToRegExp } from "../../src/domain/branchName.js";

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
