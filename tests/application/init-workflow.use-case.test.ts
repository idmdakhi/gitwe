import { describe, expect, it, vi } from "vitest";
import { InitWorkflowUseCase } from "../../src/application/use-cases/init-workflow.use-case.js";
import { classicPreset } from "../../src/domain/config/presets.js";
import type { ConfigRepository } from "../../src/domain/ports/config-repository.port.js";
import type { GitRepository } from "../../src/domain/ports/git-repository.port.js";
import type { HookRunner } from "../../src/domain/ports/hook-runner.port.js";

import { ConfigError } from "../../src/domain/errors/index.js";
import { fakeGit, noopHooks, recordingHooks } from "../helper/test-helpers.js";
import type { WorkflowConfig } from "../../src/domain/entities/workflow-config.entity.js";

describe("InitWorkflowUseCase", () => {
  function fakeConfigRepo(initial?: any): ConfigRepository {
    let config = initial;
    return {
      path: "/fake/path",
      load: vi.fn().mockImplementation(async () => config),
      save: vi.fn().mockImplementation(async (c) => {
        config = c;
      }),
    };
  }

  function fakeGit(): GitRepository {
    return {
      cwd: "/fake",
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
    };
  }

  const noopHooks: HookRunner = { run: vi.fn().mockResolvedValue(undefined) };

  it("writes a new config from preset", async () => {
    const configRepo = fakeConfigRepo();
    const git = fakeGit();
    const useCase = new InitWorkflowUseCase(configRepo, git, noopHooks);
    const result = await useCase.execute({ preset: "classic" });

    expect(result.name).toBe("classic");
    expect(configRepo.save).toHaveBeenCalled();
    expect(git.createBranch).toHaveBeenCalledWith("main", "HEAD");
    expect(git.createBranch).toHaveBeenCalledWith("develop", "main");
  });

  it("throws if config exists and force=false", async () => {
    const configRepo = fakeConfigRepo(classicPreset());
    const useCase = new InitWorkflowUseCase(configRepo, fakeGit(), noopHooks);
    await expect(useCase.execute({ preset: "classic" })).rejects.toMatchObject({
      code: "CONFIG",
    });
  });

  it("overwrites if force=true", async () => {
    const configRepo = fakeConfigRepo(classicPreset());
    const git = fakeGit();
    const useCase = new InitWorkflowUseCase(configRepo, git, noopHooks);
    const result = await useCase.execute({ preset: "github", force: true });

    expect(result.name).toBe("github");
    // انتظار داریم که شاخه‌های قبلی پاک نشوند، اما شاخه‌های جدید ساخته شوند
    expect(git.createBranch).toHaveBeenCalledWith("main", "HEAD");
  });

  it("does not create branches if createBranches=false", async () => {
    const configRepo = fakeConfigRepo();
    const git = fakeGit();
    const useCase = new InitWorkflowUseCase(configRepo, git, noopHooks);
    await useCase.execute({ preset: "classic", createBranches: false });

    expect(git.createBranch).not.toHaveBeenCalled();
  });
});

function fakeConfigRepo(overrides: Partial<ConfigRepository> = {}): ConfigRepository {
  return {
    path: "/repo/.gitwe/gitwe.yaml",
    load: async () => undefined,
    save: async () => undefined,
    ...overrides,
  };
}

describe("InitWorkflowUseCase", () => {
  it("saves a preset-based config when no config file exists yet", async () => {
    let saved: WorkflowConfig | undefined;
    const configRepo = fakeConfigRepo({ save: async (c) => void (saved = c) });
    const useCase = new InitWorkflowUseCase(configRepo, fakeGit(), noopHooks);

    const result = await useCase.execute({ preset: "classic" });

    expect(result.name).toBe("classic");
    expect(saved?.name).toBe("classic");
  });

  it("prefers an explicit config over a preset when both are given", async () => {
    let saved: WorkflowConfig | undefined;
    const configRepo = fakeConfigRepo({ save: async (c) => void (saved = c) });
    const useCase = new InitWorkflowUseCase(configRepo, fakeGit(), noopHooks);
    const custom = { ...classicPreset(), name: "custom" };

    await useCase.execute({ preset: "github", config: custom });

    expect(saved?.name).toBe("custom");
  });

  it("throws when neither a preset nor a config is given", async () => {
    const useCase = new InitWorkflowUseCase(fakeConfigRepo(), fakeGit(), noopHooks);
    await expect(useCase.execute({})).rejects.toThrow(ConfigError);
  });

  it("refuses to overwrite an existing config without --force", async () => {
    const configRepo = fakeConfigRepo({ load: async () => classicPreset() });
    const useCase = new InitWorkflowUseCase(configRepo, fakeGit(), noopHooks);
    await expect(useCase.execute({ preset: "classic" })).rejects.toThrow(ConfigError);
  });

  it("overwrites an existing config when force is true", async () => {
    let saved: WorkflowConfig | undefined;
    const configRepo = fakeConfigRepo({
      load: async () => classicPreset(),
      save: async (c) => void (saved = c),
    });
    const useCase = new InitWorkflowUseCase(configRepo, fakeGit(), noopHooks);

    await useCase.execute({ preset: "github", force: true });

    expect(saved?.name).toBe("github");
  });

  it("rejects an invalid explicit config even with force", async () => {
    const configRepo = fakeConfigRepo();
    const useCase = new InitWorkflowUseCase(configRepo, fakeGit(), noopHooks);
    const invalid = { ...classicPreset(), baseBranches: [] };

    await expect(useCase.execute({ config: invalid })).rejects.toThrow();
  });

  it("creates missing base branches by default", async () => {
    const created: { branch: string; startPoint: string }[] = [];
    const git = fakeGit({
      branchExists: async () => false,
      createBranch: async (branch, startPoint) => void created.push({ branch, startPoint }),
    });
    const useCase = new InitWorkflowUseCase(fakeConfigRepo(), git, noopHooks);

    await useCase.execute({ preset: "classic" });

    expect(created).toEqual([
      { branch: "main", startPoint: "HEAD" },
      { branch: "develop", startPoint: "main" },
    ]);
  });

  it("skips branches that already exist", async () => {
    const created: string[] = [];
    const git = fakeGit({
      branchExists: async (b) => b === "main",
      createBranch: async (branch) => void created.push(branch),
    });
    const useCase = new InitWorkflowUseCase(fakeConfigRepo(), git, noopHooks);

    await useCase.execute({ preset: "classic" });

    expect(created).toEqual(["develop"]);
  });

  it("does not create any branches when createBranches is false", async () => {
    const created: string[] = [];
    const git = fakeGit({
      branchExists: async () => false,
      createBranch: async (branch) => void created.push(branch),
    });
    const useCase = new InitWorkflowUseCase(fakeConfigRepo(), git, noopHooks);

    await useCase.execute({ preset: "classic", createBranches: false });

    expect(created).toEqual([]);
  });

  it("runs pre-init then post-init hooks with created-branch details", async () => {
    const hooks = recordingHooks();
    const git = fakeGit({ branchExists: async () => false });
    const useCase = new InitWorkflowUseCase(fakeConfigRepo(), git, hooks);

    await useCase.execute({ preset: "classic" });

    expect(hooks.calls.map((c) => c.name)).toEqual(["pre-init", "post-init"]);
    expect(hooks.calls[1]?.ctx.extra).toMatchObject({
      workflowName: "classic",
      createdBranches: ["main", "develop"],
    });
  });
});
