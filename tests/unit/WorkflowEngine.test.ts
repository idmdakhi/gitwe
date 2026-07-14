import { describe, it, expect, beforeEach } from "vitest";
import { WorkflowEngine } from "../../src/core/WorkflowEngine";
import { gitFlowDefinition, validateWorkflowDefinition } from "../../src/core/WorkflowDefinition";
import { InMemoryGitAdapter } from "../support/InMemoryGitAdapter";
import {
  UnknownBranchTypeError,
  InvalidBranchNameError,
  BranchNotFoundError,
  UnrecognizedBranchError,
  InvalidWorkflowDefinitionError,
} from "../../src/core/errors";

describe("WorkflowEngine.start (git-flow definition)", () => {
  let git: InMemoryGitAdapter;
  let engine: WorkflowEngine;

  beforeEach(() => {
    git = new InMemoryGitAdapter();
    git.seedBranch("develop");
    engine = new WorkflowEngine(git, gitFlowDefinition);
  });

  it("starts a feature branch from develop", async () => {
    const name = await engine.start("feature", "login");
    expect(name).toBe("feature/login");
    expect(await git.getCurrentBranch()).toBe("feature/login");
  });

  it("starts a hotfix branch from main", async () => {
    const name = await engine.start("hotfix", "urgent-bug");
    expect(name).toBe("hotfix/urgent-bug");
    expect(await git.getCurrentBranch()).toBe("hotfix/urgent-bug");
  });

  it("rejects an unknown branch type", async () => {
    await expect(engine.start("bugfix", "x")).rejects.toThrow(UnknownBranchTypeError);
  });

  it("rejects an empty short name", async () => {
    await expect(engine.start("feature", "  ")).rejects.toThrow(InvalidBranchNameError);
  });

  it("rejects a short name with whitespace", async () => {
    await expect(engine.start("feature", "bad name")).rejects.toThrow(InvalidBranchNameError);
  });

  it("fails if the required base branch doesn't exist", async () => {
    const bareGit = new InMemoryGitAdapter(); // no "develop" seeded
    const bareEngine = new WorkflowEngine(bareGit, gitFlowDefinition);
    await expect(bareEngine.start("feature", "x")).rejects.toThrow(BranchNotFoundError);
  });

  it("lists the branch types from the injected definition", () => {
    expect(engine.listBranchTypes()).toEqual(["feature", "release", "hotfix"]);
  });
});

describe("WorkflowEngine.finish (git-flow definition)", () => {
  let git: InMemoryGitAdapter;
  let engine: WorkflowEngine;

  beforeEach(() => {
    git = new InMemoryGitAdapter();
    git.seedBranch("develop");
    engine = new WorkflowEngine(git, gitFlowDefinition);
  });

  it("merges a feature branch into develop and deletes it by default", async () => {
    await engine.start("feature", "login");
    const result = await engine.finish("feature/login");

    expect(result.merges).toEqual([
      { source: "feature/login", target: "develop", fastForward: false },
    ]);
    expect(result.deleted).toBe(true);
    expect(git.getDeletedBranches()).toContain("feature/login");
  });

  it("merges a release branch into both main and develop", async () => {
    await engine.start("release", "1.2.0");
    const result = await engine.finish("release/1.2.0");

    const targets = result.merges.map((m) => m.target);
    expect(targets).toEqual(["main", "develop"]);
  });

  it("keeps the branch when deleteAfterMerge is false", async () => {
    await engine.start("feature", "login");
    const result = await engine.finish("feature/login", { deleteAfterMerge: false });

    expect(result.deleted).toBe(false);
    expect(await git.branchExists("feature/login")).toBe(true);
  });

  it("throws when the branch doesn't match any known prefix", async () => {
    git.seedBranch("random-branch");
    await expect(engine.finish("random-branch")).rejects.toThrow(UnrecognizedBranchError);
  });

  it("throws when the branch to finish doesn't exist", async () => {
    await expect(engine.finish("feature/never-started")).rejects.toThrow(BranchNotFoundError);
  });

  it("throws when a merge target doesn't exist", async () => {
    const bareGit = new InMemoryGitAdapter();
    const bareEngine = new WorkflowEngine(bareGit, gitFlowDefinition);
    await bareEngine.start("hotfix", "x");
    await bareGit.deleteBranch("main");
    await expect(bareEngine.finish("hotfix/x")).rejects.toThrow(BranchNotFoundError);
  });
});

describe("validateWorkflowDefinition", () => {
  it("accepts the built-in git-flow definition", () => {
    expect(() => validateWorkflowDefinition(gitFlowDefinition)).not.toThrow();
  });

  it("rejects a definition with no branch types", () => {
    expect(() => validateWorkflowDefinition({ name: "empty", branchTypes: [] })).toThrow(
      InvalidWorkflowDefinitionError,
    );
  });

  it("rejects duplicate branch type names", () => {
    const def = {
      name: "broken",
      branchTypes: [
        { name: "feature", prefix: "feature/", baseBranch: "develop", mergeTargets: ["develop"] },
        { name: "feature", prefix: "feat/", baseBranch: "develop", mergeTargets: ["develop"] },
      ],
    };
    expect(() => validateWorkflowDefinition(def)).toThrow(InvalidWorkflowDefinitionError);
  });

  it("rejects a branch type with no merge targets", () => {
    const def = {
      name: "broken",
      branchTypes: [
        { name: "feature", prefix: "feature/", baseBranch: "develop", mergeTargets: [] },
      ],
    };
    expect(() => validateWorkflowDefinition(def)).toThrow(InvalidWorkflowDefinitionError);
  });
});
