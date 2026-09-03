import { describe, expect, it } from "vitest";
import { TrackBranchUseCase } from "../../src/application/use-cases/track-branch.use-case.js";
import { WorkflowService } from "../../src/domain/services/workflow.service.js";
import { classicPreset } from "../../src/domain/config/presets.js";
import { silentLogger } from "../../src/domain/ports/logger.port.js";
import { ValidationError } from "../../src/domain/errors/index.js";
import { fakeGit } from "../helper/test-helpers.js";

describe("TrackBranchUseCase", () => {
  const workflow = new WorkflowService(classicPreset());

  it("tracks a full branch name from the default remote", async () => {
    const git = fakeGit({
      branchExists: async () => false,
      remoteBranchExists: async () => true,
    });
    const useCase = new TrackBranchUseCase(workflow, git, silentLogger);

    const result = await useCase.execute({ branchOrType: "feature/checkout" });

    expect(result).toEqual({ branch: "feature/checkout", remote: "origin" });
  });

  it("tracks using a type + short name pair", async () => {
    const git = fakeGit({
      branchExists: async () => false,
      remoteBranchExists: async () => true,
    });
    const useCase = new TrackBranchUseCase(workflow, git, silentLogger);

    const result = await useCase.execute({ branchOrType: "feature", name: "checkout" });

    expect(result).toEqual({ branch: "feature/checkout", remote: "origin" });
  });

  it("creates the local branch from the remote-tracking ref and sets upstream", async () => {
    const created: { branch: string; startPoint: string }[] = [];
    const checkedOut: string[] = [];
    const upstreams: { branch: string; remote: string }[] = [];
    const git = fakeGit({
      branchExists: async () => false,
      remoteBranchExists: async () => true,
      createBranch: async (branch, startPoint) => void created.push({ branch, startPoint }),
      checkout: async (b) => void checkedOut.push(b),
      setUpstream: async (branch, remote) => void upstreams.push({ branch, remote }),
    });
    const useCase = new TrackBranchUseCase(workflow, git, silentLogger);

    await useCase.execute({ branchOrType: "feature/checkout" });

    expect(created).toEqual([
      { branch: "feature/checkout", startPoint: "origin/feature/checkout" },
    ]);
    expect(checkedOut).toEqual(["feature/checkout"]);
    expect(upstreams).toEqual([{ branch: "feature/checkout", remote: "origin" }]);
  });

  it("throws when the full branch name matches no known type", async () => {
    const useCase = new TrackBranchUseCase(workflow, fakeGit(), silentLogger);
    await expect(useCase.execute({ branchOrType: "not-a-topic" })).rejects.toThrow(ValidationError);
  });

  it("throws when the local branch already exists", async () => {
    const git = fakeGit({ branchExists: async () => true });
    const useCase = new TrackBranchUseCase(workflow, git, silentLogger);
    await expect(useCase.execute({ branchOrType: "feature/login" })).rejects.toThrow(
      ValidationError,
    );
  });

  it("throws when the default remote is not configured", async () => {
    const git = fakeGit({ branchExists: async () => false, remoteExists: async () => false });
    const useCase = new TrackBranchUseCase(workflow, git, silentLogger);
    await expect(useCase.execute({ branchOrType: "feature/checkout" })).rejects.toThrow(
      ValidationError,
    );
  });

  it("throws when the remote branch does not exist", async () => {
    const git = fakeGit({ branchExists: async () => false, remoteBranchExists: async () => false });
    const useCase = new TrackBranchUseCase(workflow, git, silentLogger);
    await expect(useCase.execute({ branchOrType: "feature/checkout" })).rejects.toThrow(
      ValidationError,
    );
  });
});
