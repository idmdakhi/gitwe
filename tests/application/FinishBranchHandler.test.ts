import { describe, it, expect, beforeEach, vi } from "vitest";
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
  // BranchNotFoundError,
  // UnrecognizedBranchError,
  // WorkflowRuleViolationError,
  ProtectedBranchError,
} from "#gitwe/domain/errors";
import { InMemoryGitRepository } from "#tests/support/InMemoryGitRepository";
import { InMemoryHookRunner } from "#tests/support/InMemoryHookRunner";
import { InMemoryEventBus } from "#gitwe/infrastructure/events/InMemoryEventBus";
import { NoopLogger } from "#gitwe/infrastructure/logging/NoopLogger";
import { VersionService } from "#gitwe/application/services/VersionService";

describe("FinishBranchHandler", () => {
  let git: InMemoryGitRepository;
  let workflow: Workflow;
  let handler: FinishBranchHandler;

  // Helper to create a mock VersionService for tests that don't rely on versioning
  function createMockVersionService(): VersionService {
    return {
      resolveCurrent: vi.fn().mockResolvedValue(undefined),
      bump: vi.fn().mockResolvedValue({
        previous: { toString: () => "1.0.0" },
        next: { toString: () => "1.0.1" },
        tag: "v1.0.1",
      }),
      tag: vi.fn().mockResolvedValue("v1.0.0"),
    } as unknown as VersionService;
  }

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
      new VersionService({
        stores: [],
        git,
        logger: new NoopLogger(),
        requireCleanTree: false,
        tagPrefix: "v",
      }),
    );
    void handler;
  });

  // ... (all tests remain the same)

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
      new InMemoryEventBus(),
      new NoopLogger(),
      createMockVersionService(), // Add version service
    );

    await handlerWithOverride.handle({ branchName: "feature/login" });

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
      new InMemoryEventBus(),
      new NoopLogger(),
      createMockVersionService(), // Add version service
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
      createMockVersionService(), // Add version service
    );

    await expect(protectedHandler.handle({ branchName: "feature/login" })).rejects.toThrow(
      ProtectedBranchError,
    );
  });
});
