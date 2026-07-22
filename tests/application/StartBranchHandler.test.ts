import { describe, it, expect, beforeEach } from "vitest";
import { Workflow } from "../../src/domain/aggregates/Workflow";
import { BranchTypeRule } from "../../src/domain/valueObjects/BranchTypeRule";
import { RuleEvaluator } from "../../src/domain/services/RuleEvaluator";
import { BranchDoesNotExistRule } from "../../src/domain/rules/BranchDoesNotExistRule";
import { BaseBranchExistsRule } from "../../src/domain/rules/BaseBranchExistsRule";
import { HookPhase } from "../../src/domain/hooks/HookPhase";
import { HookDefinition } from "../../src/domain/hooks/HookDefinition";
import { UnknownBranchTypeError, InvalidBranchNameError } from "../../src/domain/errors";
import { BranchService } from "../../src/application/services/BranchService";
import { HookService } from "../../src/application/services/HookService";
import { StartBranchHandler } from "../../src/application/handlers/StartBranchHandler";
import { InMemoryGitRepository } from "../support/InMemoryGitRepository";
import { InMemoryHookRunner } from "../support/InMemoryHookRunner";
import { InMemoryEventBus } from "../../src/infrastructure/events/InMemoryEventBus";
import { NoopLogger } from "../../src/infrastructure/logging/NoopLogger";

describe("StartBranchHandler", () => {
  let git: InMemoryGitRepository;
  let hookRunner: InMemoryHookRunner;
  let workflow: Workflow;
  let handler: StartBranchHandler;

  beforeEach(() => {
    git = new InMemoryGitRepository();
    git.seedBranch("develop");
    hookRunner = new InMemoryHookRunner();

    workflow = Workflow.create({
      name: "test",
      branchTypes: [
        BranchTypeRule.create({
          name: "feature",
          prefix: "feature/",
          baseBranch: "develop",
          mergeTargets: ["develop"],
        }),
      ],
      hooks: HookDefinition.create({ preStart: ["echo pre"], postStart: ["echo post"] }),
    });

    const ruleEvaluator = new RuleEvaluator([new BranchDoesNotExistRule(), new BaseBranchExistsRule()]);
    const branchService = new BranchService(git, ruleEvaluator);
    const hookService = new HookService(hookRunner);

    handler = new StartBranchHandler(workflow, branchService, hookService, new InMemoryEventBus(), new NoopLogger());
  });

  it("creates a prefixed branch from the configured base branch", async () => {
    const result = await handler.handle({ branchType: "feature", shortName: "login" });

    expect(result.branchName).toBe("feature/login");
    expect(result.baseBranch).toBe("develop");
    expect(await git.branchExists("feature/login")).toBe(true);
    expect(await git.getCurrentBranch()).toBe("feature/login");
  });

  it("runs preStart and postStart hooks in order", async () => {
    await handler.handle({ branchType: "feature", shortName: "login" });

    expect(hookRunner.calls.map((c) => c.phase)).toEqual([HookPhase.PreStart, HookPhase.PostStart]);
  });

  it("rejects an unknown branch type", async () => {
    await expect(handler.handle({ branchType: "bogus", shortName: "x" })).rejects.toThrow(
      UnknownBranchTypeError,
    );
  });

  it("rejects an invalid short name", async () => {
    await expect(handler.handle({ branchType: "feature", shortName: "" })).rejects.toThrow(
      InvalidBranchNameError,
    );
  });
});
