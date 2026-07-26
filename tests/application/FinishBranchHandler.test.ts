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
  ProtectedBranchError,
} from "#gitwe/domain/errors";
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

  it("dry-run reports the plan without touching git", async () => {
    const result = await handler.handle({ branchName: "feature/login", dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.merges).toEqual([
      { source: "feature/login", target: "develop", fastForward: false },
    ]);
    expect(result.deleted).toBe(true);
    expect(git.getDeletedBranches()).not.toContain("feature/login");
    expect(git.getMergeLog()).toHaveLength(0);
  });

  it("force-deletes after a squash merge, since git never sees it as fully merged", async () => {
    await handler.handle({ branchName: "feature/login", strategy: "squash" });

    // The in-memory double records the actual `force` flag it was called with.
    expect(git.getDeletedBranches()).toContain("feature/login");
    expect(git.getLastDeleteForce()).toBe(true);
  });

  it("does not force-delete after a regular merge", async () => {
    await handler.handle({ branchName: "feature/login" });

    expect(git.getLastDeleteForce()).toBe(false);
  });

  it("uses the workflow's default merge strategy when no override is given", async () => {
    await handler.handle({ branchName: "feature/login" });

    expect(git.getMergeLog()[0]?.source).toBe("feature/login");
  });

  it("overrides the workflow's merge strategy for a single finish via `strategy`", async () => {
    git.seedBranch("release/1.2.0", "develop");

    await handler.handle({ branchName: "release/1.2.0", strategy: "rebase" });

    // Rebase strategy always resolves to a fast-forward outcome in the in-memory model.
    const outcomes = git.getMergeLog().slice(-2);
    expect(outcomes.every((o) => o.fastForward)).toBe(true);
  });

  it("uses a branch type's own mergeStrategy override instead of the workflow default", async () => {
    const workflowWithOverride = Workflow.create({
      name: "test",
      mergeStrategy: "merge", // workflow default
      branchTypes: [
        BranchTypeRule.create({
          name: "feature",
          prefix: "feature/",
          baseBranch: "develop",
          mergeTargets: ["develop"],
          mergeStrategy: "squash", // per-type override
        }),
      ],
    });
    const handlerWithOverride = new FinishBranchHandler(
      workflowWithOverride,
      git,
      new RuleEvaluator([new WorkingTreeCleanRule()]),
      new MergeService(git),
      new TagService(git),
      new HookService(new InMemoryHookRunner()),
      new RemoteService(git),
      new InMemoryEventBus(new NoopLogger()),
      new NoopLogger(),
    );

    await handlerWithOverride.handle({ branchName: "feature/login" });

    // Squash always force-deletes (see the dedicated test above), so this
    // only happens if the branch type's "squash" override actually won.
    expect(git.getLastDeleteForce()).toBe(true);
  });

  it("a CLI-level `strategy` still wins over a branch type's own override", async () => {
    const workflowWithOverride = Workflow.create({
      name: "test",
      branchTypes: [
        BranchTypeRule.create({
          name: "feature",
          prefix: "feature/",
          baseBranch: "develop",
          mergeTargets: ["develop"],
          mergeStrategy: "squash",
        }),
      ],
    });
    const handlerWithOverride = new FinishBranchHandler(
      workflowWithOverride,
      git,
      new RuleEvaluator([new WorkingTreeCleanRule()]),
      new MergeService(git),
      new TagService(git),
      new HookService(new InMemoryHookRunner()),
      new RemoteService(git),
      new InMemoryEventBus(new NoopLogger()),
      new NoopLogger(),
    );

    await handlerWithOverride.handle({ branchName: "feature/login", strategy: "merge" });

    expect(git.getLastDeleteForce()).toBe(false);
  });

  it("refuses to finish a protected branch", async () => {
    const protectedWorkflow = Workflow.create({
      name: "test",
      branchTypes: [...workflow.branchTypes],
      protectedBranches: ["feature/login"],
    });
    const protectedHandler = new FinishBranchHandler(
      protectedWorkflow,
      git,
      new RuleEvaluator([]),
      new MergeService(git),
      new TagService(git),
      new HookService(new InMemoryHookRunner()),
      new RemoteService(git),
      new InMemoryEventBus(),
      new NoopLogger(),
    );

    await expect(protectedHandler.handle({ branchName: "feature/login" })).rejects.toThrow(
      ProtectedBranchError,
    );
  });
});
