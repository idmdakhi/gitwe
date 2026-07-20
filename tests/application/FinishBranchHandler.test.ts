import { describe, it, expect, beforeEach } from "vitest";
import { Workflow } from "#gitwe/domain/aggregates/Workflow";
import { BranchTypeRule } from "#gitwe/domain/valueObjects/BranchTypeRule";
import { RuleEvaluator } from "#gitwe/domain/services/RuleEvaluator";
import { WorkingTreeCleanRule } from "#gitwe/domain/rules/WorkingTreeCleanRule";
import { MergeService } from "#gitwe/application/services/MergeService";
import { TagService } from "#gitwe/application/services/TagService";
import { HookService } from "#gitwe/application/services/HookService";
import { RemoteService } from "#gitwe/application/services/RemoteService";
import { FinishBranchHandler } from "#gitwe/application/handlers/FinishBranchHandler";
import {
  BranchNotFoundError,
  UnrecognizedBranchError,
  WorkflowRuleViolationError,
} from "#gitwe/domain/errors/index";
import { InMemoryGitRepository } from "#tests/support/InMemoryGitRepository";
import { InMemoryHookRunner } from "#tests/support/InMemoryHookRunner";
import { InMemoryEventBus } from "#gitwe/infrastructure/events/InMemoryEventBus";
import { NoopLogger } from "#gitwe/infrastructure/logging/NoopLogger";

describe("FinishBranchHandler", () => {
  let git: InMemoryGitRepository;
  let workflow: Workflow;
  let handler: FinishBranchHandler;

  beforeEach(() => {
    git = new InMemoryGitRepository();
    git.seedBranch("develop");
    git.seedBranch("main");
    git.seedBranch("feature/login", "develop");

    workflow = Workflow.create({
      name: "test",
      branchTypes: [
        BranchTypeRule.create({
          name: "feature",
          prefix: "feature/",
          baseBranch: "develop",
          mergeTargets: ["develop"],
        }),
        BranchTypeRule.create({
          name: "release",
          prefix: "release/",
          baseBranch: "develop",
          mergeTargets: ["main", "develop"],
          autoTag: { prefix: "v" },
        }),
      ],
    });

    const ruleEvaluator = new RuleEvaluator([new WorkingTreeCleanRule()]);
    handler = new FinishBranchHandler(
      workflow,
      git,
      ruleEvaluator,
      new MergeService(git),
      new TagService(git),
      new HookService(new InMemoryHookRunner()),
      new RemoteService(git),
      new InMemoryEventBus(),
      new NoopLogger(),
    );
  });

  it("merges into the configured target and deletes the branch by default", async () => {
    const result = await handler.handle({ branchName: "feature/login" });

    expect(result.merges).toEqual([
      { source: "feature/login", target: "develop", fastForward: false },
    ]);
    expect(result.deleted).toBe(true);
    expect(git.getDeletedBranches()).toContain("feature/login");
  });

  it("merges into multiple targets and creates a tag for release branches", async () => {
    git.seedBranch("release/1.2.0", "develop");

    const result = await handler.handle({ branchName: "release/1.2.0" });

    expect(result.merges.map((m) => m.target)).toEqual(["main", "develop"]);
    expect(result.tags).toEqual(["v1.2.0"]);
    expect(git.getTags()).toContain("v1.2.0");
  });

  it("keeps the branch when deleteAfterMerge is false", async () => {
    const result = await handler.handle({ branchName: "feature/login", deleteAfterMerge: false });

    expect(result.deleted).toBe(false);
    expect(await git.branchExists("feature/login")).toBe(true);
  });

  it("pushes only once even with multiple merge targets", async () => {
    git.seedBranch("release/1.2.0", "develop");

    await handler.handle({ branchName: "release/1.2.0", pushAfterFinish: true });

    expect(git.getPushedRemotes()).toEqual(["origin"]);
  });

  it("throws for a branch that doesn't exist", async () => {
    await expect(handler.handle({ branchName: "feature/missing" })).rejects.toThrow(
      BranchNotFoundError,
    );
  });

  it("throws for a branch that doesn't match any branch type prefix", async () => {
    git.seedBranch("chore/cleanup");
    await expect(handler.handle({ branchName: "chore/cleanup" })).rejects.toThrow(
      UnrecognizedBranchError,
    );
  });

  it("refuses to finish with a dirty working tree", async () => {
    git.setWorkingTreeClean(false);
    await expect(handler.handle({ branchName: "feature/login" })).rejects.toThrow(
      WorkflowRuleViolationError,
    );
  });
});
