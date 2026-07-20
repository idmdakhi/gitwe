import { describe, it, expect } from "vitest";
import { Workflow } from "../../src/domain/aggregates/Workflow";
import { BranchTypeRule } from "../../src/domain/valueObjects/BranchTypeRule";
import { InvalidWorkflowDefinitionError } from "../../src/domain/errors";

function feature(overrides: Partial<Parameters<typeof BranchTypeRule.create>[0]> = {}) {
  return BranchTypeRule.create({
    name: "feature",
    prefix: "feature/",
    baseBranch: "develop",
    mergeTargets: ["develop"],
    ...overrides,
  });
}

describe("Workflow", () => {
  it("builds successfully with valid branch types", () => {
    const workflow = Workflow.create({ name: "test", branchTypes: [feature()] });
    expect(workflow.listBranchTypeNames()).toEqual(["feature"]);
  });

  it("rejects an empty branch type list", () => {
    expect(() => Workflow.create({ name: "test", branchTypes: [] })).toThrow(
      InvalidWorkflowDefinitionError,
    );
  });

  it("rejects duplicate branch type names", () => {
    expect(() =>
      Workflow.create({
        name: "test",
        branchTypes: [feature(), feature({ prefix: "feat2/" })],
      }),
    ).toThrow(/duplicate branch type name/);
  });

  it("rejects duplicate prefixes", () => {
    expect(() =>
      Workflow.create({
        name: "test",
        branchTypes: [feature(), feature({ name: "feature2" })],
      }),
    ).toThrow(/duplicate branch prefix/);
  });

  it("rejects a branch type with no merge targets", () => {
    expect(() =>
      Workflow.create({ name: "test", branchTypes: [feature({ mergeTargets: [] })] }),
    ).toThrow(/at least one merge target/);
  });

  it("finds a rule by branch type name", () => {
    const workflow = Workflow.create({ name: "test", branchTypes: [feature()] });
    expect(workflow.findBranchType("feature")?.prefix).toBe("feature/");
    expect(workflow.findBranchType("nope")).toBeUndefined();
  });

  it("finds a rule matching a full branch name by prefix", () => {
    const workflow = Workflow.create({ name: "test", branchTypes: [feature()] });
    expect(workflow.findRuleForBranch("feature/login")?.name).toBe("feature");
    expect(workflow.findRuleForBranch("chore/cleanup")).toBeUndefined();
  });
});
