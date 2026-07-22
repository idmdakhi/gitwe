import { describe, it, expect } from "vitest";
import { ConventionalCommitPolicy } from "#gitwe/domain/policies/ConventionalCommitPolicy";

describe("ConventionalCommitPolicy", () => {
  it("passes everything when disabled (the default)", () => {
    const policy = ConventionalCommitPolicy.create();
    expect(policy.validate("whatever i want")).toBeUndefined();
  });

  it("accepts a valid conventional commit message when enabled", () => {
    const policy = ConventionalCommitPolicy.create({ enabled: true });
    expect(policy.validate("feat(auth): add password reset")).toBeUndefined();
    expect(policy.validate("fix: correct off-by-one error")).toBeUndefined();
    expect(policy.validate("chore!: drop node 16 support")).toBeUndefined();
  });

  it("rejects a message that doesn't follow the format when enabled", () => {
    const policy = ConventionalCommitPolicy.create({ enabled: true });
    expect(policy.validate("fixed a bug")).toMatch(/Conventional Commits/);
    expect(policy.validate("Fix: wrong case for type")).toMatch(/Conventional Commits/);
  });
});
