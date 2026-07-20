import { describe, it, expect } from "vitest";
import { Workflow } from "#gitwe/domain/aggregates/Workflow";
import { BranchTypeRule } from "#gitwe/domain/valueObjects/BranchTypeRule";
import { RuleEvaluator } from "#gitwe/domain/services/RuleEvaluator";
import { BranchDoesNotExistRule } from "#gitwe/domain/rules/BranchDoesNotExistRule";
import { BaseBranchExistsRule } from "#gitwe/domain/rules/BaseBranchExistsRule";
import { WorkingTreeCleanRule } from "#gitwe/domain/rules/WorkingTreeCleanRule";
import { WorkflowRuleViolationError } from "#gitwe/domain/errors/index";
import { InMemoryGitRepository } from "#tests/support/InMemoryGitRepository";

const workflow = Workflow.create({
  name: "test",
  branchTypes: [
    BranchTypeRule.create({
      name: "feature",
      prefix: "feature/",
      baseBranch: "develop",
      mergeTargets: ["develop"],
    }),
  ],
});

describe("RuleEvaluator", () => {
  it("passes when every rule is satisfied", async () => {
    const git = new InMemoryGitRepository();
    git.seedBranch("develop");
    const evaluator = new RuleEvaluator([new BranchDoesNotExistRule(), new BaseBranchExistsRule()]);

    await expect(
      evaluator.assertAllSatisfied({
        workflow,
        action: "start",
        branchName: "feature/login",
        baseBranch: "develop",
        git,
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects starting a branch that already exists", async () => {
    const git = new InMemoryGitRepository();
    git.seedBranch("develop");
    git.seedBranch("feature/login");
    const evaluator = new RuleEvaluator([new BranchDoesNotExistRule()]);

    await expect(
      evaluator.assertAllSatisfied({
        workflow,
        action: "start",
        branchName: "feature/login",
        baseBranch: "develop",
        git,
      }),
    ).rejects.toThrow(WorkflowRuleViolationError);
  });

  it("rejects starting from a base branch that doesn't exist", async () => {
    const git = new InMemoryGitRepository();
    const evaluator = new RuleEvaluator([new BaseBranchExistsRule()]);

    await expect(
      evaluator.assertAllSatisfied({
        workflow,
        action: "start",
        branchName: "feature/login",
        baseBranch: "develop",
        git,
      }),
    ).rejects.toThrow(/base branch "develop" does not exist/);
  });

  it("rejects finishing with a dirty working tree", async () => {
    const git = new InMemoryGitRepository();
    git.setWorkingTreeClean(false);
    const evaluator = new RuleEvaluator([new WorkingTreeCleanRule()]);

    await expect(
      evaluator.assertAllSatisfied({
        workflow,
        action: "finish",
        branchName: "feature/login",
        git,
      }),
    ).rejects.toThrow(/uncommitted changes/);
  });

  it("ignores start-only rules during finish, and vice versa", async () => {
    const git = new InMemoryGitRepository();
    const evaluator = new RuleEvaluator([new BranchDoesNotExistRule(), new WorkingTreeCleanRule()]);

    // BranchDoesNotExistRule only applies to "start"; WorkingTreeCleanRule only to "finish".
    // Neither should fire here.
    await expect(
      evaluator.assertAllSatisfied({ workflow, action: "start", branchName: "feature/x", git }),
    ).resolves.toBeUndefined();
  });
});
