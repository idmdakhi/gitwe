import { describe, expect, it, vi } from "vitest";
import { StartBranchUseCase } from "../../src/application/use-cases/start-branch.use-case.js";
import { WorkflowService } from "../../src/domain/services/workflow.service.js";
import { classicPreset } from "../../src/domain/config/presets.js";
import { silentLogger } from "../../src/domain/ports/logger.port.js";
import type { GitRepository } from "../../src/domain/ports/git-repository.port.js";
import type { HookRunner } from "../../src/domain/ports/hook-runner.port.js";

import { ValidationError } from "../../src/domain/errors/index.js";
import { fakeGit, recordingHooks } from "../helper/test-helpers.js";

describe("StartBranchUseCase", () => {
  const workflow = new WorkflowService(classicPreset());

  function fakeGit(overrides: Partial<GitRepository> = {}): GitRepository {
    return {
      cwd: "/tmp/fake",
      currentBranch: vi.fn().mockResolvedValue("main"),
      listBranches: vi.fn().mockResolvedValue([]),
      branchExists: vi.fn().mockResolvedValue(false),
      remoteBranchExists: vi.fn().mockResolvedValue(false),
      upstreamOf: vi.fn().mockResolvedValue(undefined),
      aheadBehind: vi.fn().mockResolvedValue({ ahead: 0, behind: 0 }),
      isAncestor: vi.fn().mockResolvedValue(false),
      isClean: vi.fn().mockResolvedValue(true),
      conflictedFiles: vi.fn().mockResolvedValue([]),
      mergeInProgress: vi.fn().mockResolvedValue(false),
      createBranch: vi.fn().mockResolvedValue(undefined),
      checkout: vi.fn().mockResolvedValue(undefined),
      deleteBranch: vi.fn().mockResolvedValue(undefined),
      deleteRemoteBranch: vi.fn().mockResolvedValue(undefined),
      renameBranch: vi.fn().mockResolvedValue(undefined),
      merge: vi.fn().mockResolvedValue(undefined),
      continueMerge: vi.fn().mockResolvedValue(undefined),
      abortMerge: vi.fn().mockResolvedValue(undefined),
      rebase: vi.fn().mockResolvedValue(undefined),
      createTag: vi.fn().mockResolvedValue(undefined),
      tagExists: vi.fn().mockResolvedValue(false),
      fetch: vi.fn().mockResolvedValue(undefined),
      push: vi.fn().mockResolvedValue(undefined),
      remoteExists: vi.fn().mockResolvedValue(true),
      setUpstream: vi.fn().mockResolvedValue(undefined),
      listTags: vi.fn().mockResolvedValue([]),
      deleteTag: vi.fn().mockResolvedValue(undefined),
      pushTags: vi.fn().mockResolvedValue(undefined),
      deleteRemoteTag: vi.fn().mockResolvedValue(undefined),
      raw: vi.fn().mockResolvedValue(""),
      graph: vi.fn().mockResolvedValue(""),
      ...overrides,
    };
  }

  const noopHooks: HookRunner = { run: vi.fn().mockResolvedValue(undefined) };

  it("creates a new feature branch", async () => {
    const git = fakeGit();
    const useCase = new StartBranchUseCase(workflow, git, noopHooks, silentLogger);
    const result = await useCase.execute({
      typeNameOrAlias: "feature",
      name: "login",
    });

    expect(result.branch).toBe("feature/login");
    expect(result.shortName).toBe("login");
    expect(result.type.name).toBe("feature");
    expect(git.createBranch).toHaveBeenCalledWith("feature/login", "develop");
    expect(git.checkout).toHaveBeenCalledWith("feature/login");
  });

  it("uses a custom base override", async () => {
    const git = fakeGit();
    const useCase = new StartBranchUseCase(workflow, git, noopHooks, silentLogger);
    await useCase.execute({
      typeNameOrAlias: "feature",
      name: "login",
      baseOverride: "main",
    });

    expect(git.createBranch).toHaveBeenCalledWith("feature/login", "main");
  });

  it("fetches the base before creating if requested", async () => {
    const git = fakeGit({
      fetch: vi.fn().mockResolvedValue(undefined),
      remoteExists: vi.fn().mockResolvedValue(true),
    });
    const useCase = new StartBranchUseCase(workflow, git, noopHooks, silentLogger);
    await useCase.execute({
      typeNameOrAlias: "feature",
      name: "login",
      fetch: true,
    });

    expect(git.fetch).toHaveBeenCalledWith("origin", "develop");
  });

  it("throws if branch already exists", async () => {
    const git = fakeGit({
      branchExists: vi.fn().mockResolvedValue(true),
    });
    const useCase = new StartBranchUseCase(workflow, git, noopHooks, silentLogger);
    await expect(
      useCase.execute({ typeNameOrAlias: "feature", name: "login" }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("calls pre-start and post-start hooks", async () => {
    const hooks: HookRunner = {
      run: vi.fn().mockResolvedValue(undefined),
    };
    const git = fakeGit();
    const useCase = new StartBranchUseCase(workflow, git, hooks, silentLogger);
    await useCase.execute({ typeNameOrAlias: "feature", name: "login" });

    expect(hooks.run).toHaveBeenCalledTimes(2);
    expect(hooks.run).toHaveBeenNthCalledWith(
      1,
      "pre-start",
      expect.objectContaining({
        branch: "feature/login",
        branchType: "feature",
        base: "develop",
      }),
    );
    expect(hooks.run).toHaveBeenNthCalledWith(
      2,
      "post-start",
      expect.objectContaining({
        branch: "feature/login",
      }),
    );
  });
});

describe("StartBranchUseCase", () => {
  const workflow = new WorkflowService(classicPreset());

  it("creates the branch from the type's base and checks it out", async () => {
    const checkedOut: string[] = [];
    const created: { branch: string; startPoint: string }[] = [];
    const useCase = new StartBranchUseCase(
      workflow,
      fakeGit({
        createBranch: async (branch, startPoint) => void created.push({ branch, startPoint }),
        checkout: async (b) => void checkedOut.push(b),
      }),
      recordingHooks(),
      silentLogger,
    );

    const resolved = await useCase.execute({ typeNameOrAlias: "feature", name: "signup" });

    expect(resolved.branch).toBe("feature/signup");
    expect(resolved.shortName).toBe("signup");
    expect(created).toEqual([{ branch: "feature/signup", startPoint: "develop" }]);
    expect(checkedOut).toEqual(["feature/signup"]);
  });

  it("throws for an unknown branch type", async () => {
    const useCase = new StartBranchUseCase(workflow, fakeGit(), noHooks(), silentLogger);
    await expect(useCase.execute({ typeNameOrAlias: "nonsense", name: "signup" })).rejects.toThrow(
      ValidationError,
    );
  });

  it("throws when the target branch already exists", async () => {
    const git = fakeGit({ branchExists: async () => true });
    const useCase = new StartBranchUseCase(workflow, git, noHooks(), silentLogger);
    await expect(useCase.execute({ typeNameOrAlias: "feature", name: "signup" })).rejects.toThrow(
      ValidationError,
    );
  });

  it("honours an explicit base override instead of the type's default base", async () => {
    const created: { branch: string; startPoint: string }[] = [];
    const useCase = new StartBranchUseCase(
      workflow,
      fakeGit({
        createBranch: async (branch, startPoint) => void created.push({ branch, startPoint }),
      }),
      noHooks(),
      silentLogger,
    );

    await useCase.execute({ typeNameOrAlias: "feature", name: "signup", baseOverride: "main" });

    expect(created).toEqual([{ branch: "feature/signup", startPoint: "main" }]);
  });

  it("rejects an unknown base override", async () => {
    const useCase = new StartBranchUseCase(workflow, fakeGit(), noHooks(), silentLogger);
    await expect(
      useCase.execute({ typeNameOrAlias: "feature", name: "signup", baseOverride: "nope" }),
    ).rejects.toThrow(ValidationError);
  });

  it("fetches configured remotes before branching when fetch is requested", async () => {
    const fetched: { remote: string; refspec?: string }[] = [];
    const useCase = new StartBranchUseCase(
      workflow,
      fakeGit({
        fetch: async (remote, refspec) => void fetched.push({ remote, refspec }),
      }),
      noHooks(),
      silentLogger,
    );

    await useCase.execute({ typeNameOrAlias: "feature", name: "signup", fetch: true });

    expect(fetched).toEqual([{ remote: "origin", refspec: "develop" }]);
  });

  it("does not fetch when fetch is not requested", async () => {
    const fetched: string[] = [];
    const useCase = new StartBranchUseCase(
      workflow,
      fakeGit({ fetch: async (remote) => void fetched.push(remote) }),
      noHooks(),
      silentLogger,
    );

    await useCase.execute({ typeNameOrAlias: "feature", name: "signup" });

    expect(fetched).toEqual([]);
  });

  it("runs pre-start then post-start hooks with the resolved branch context", async () => {
    const hooks = recordingHooks();
    const useCase = new StartBranchUseCase(workflow, fakeGit(), hooks, silentLogger);

    await useCase.execute({ typeNameOrAlias: "feature", name: "signup" });

    expect(hooks.calls.map((c) => c.name)).toEqual(["pre-start", "post-start"]);
    expect(hooks.calls[0]?.ctx).toMatchObject({
      branch: "feature/signup",
      branchType: "feature",
      base: "develop",
    });
  });
});

function noHooks() {
  return { run: async () => undefined };
}
