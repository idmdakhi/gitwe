import { describe, it, expect } from "vitest";
import { BranchNamingPolicy } from "../../src/domain/valueObjects/BranchNamingPolicy";

describe("BranchNamingPolicy", () => {
  it("allows anything by default", () => {
    const policy = BranchNamingPolicy.create();
    expect(policy.validate("Anything_Goes-123")).toBeUndefined();
  });

  it("enforces kebab-case", () => {
    const policy = BranchNamingPolicy.create({ case: "kebab-case" });
    expect(policy.validate("fix-login-bug")).toBeUndefined();
    expect(policy.validate("fix_login_bug")).toMatch(/kebab-case/);
    expect(policy.validate("FixLoginBug")).toMatch(/kebab-case/);
  });

  it("enforces snake_case", () => {
    const policy = BranchNamingPolicy.create({ case: "snake_case" });
    expect(policy.validate("fix_login_bug")).toBeUndefined();
    expect(policy.validate("fix-login-bug")).toMatch(/snake_case/);
  });

  it("enforces camelCase", () => {
    const policy = BranchNamingPolicy.create({ case: "camelCase" });
    expect(policy.validate("fixLoginBug")).toBeUndefined();
    expect(policy.validate("fix-login-bug")).toMatch(/camelCase/);
  });

  it("enforces max length", () => {
    const policy = BranchNamingPolicy.create({ maxLength: 5 });
    expect(policy.validate("short")).toBeUndefined();
    expect(policy.validate("way-too-long")).toMatch(/5 characters/);
  });

  it("enforces a custom pattern when given", () => {
    const policy = BranchNamingPolicy.create({ pattern: "^[A-Z]+-\\d+-.+$" });
    expect(policy.validate("JIRA-123-fix-thing")).toBeUndefined();
    expect(policy.validate("fix-thing")).toMatch(/pattern/);
  });
});
