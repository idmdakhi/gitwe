import { describe, expect, it } from "vitest";
import { UpdateBranchUseCase } from "../../src/application/use-cases/update-branch.use-case.js";
import { WorkflowService } from "../../src/domain/services/workflow.service.js";
import { classicPreset } from "../../src/domain/config/presets.js";
import { silentLogger } from "../../src/domain/ports/logger.port.js";
import { ConflictError, ValidationError } from "../../src/domain/errors/index.js";
import { fakeGit, noopHooks, recordingHooks } from "../helper/test-helpers.js";

describe("UpdateBranchUseCase", () => {
  const workflow = new WorkflowService(classicPreset());

  it("merges the base into the branch by default", async () => {
    const merged: string[] = [];
    const git = fakeGit({ merge: async (b) => void merged.push(b) });
    const useCase = new UpdateBranchUseCase(workflow, git, noopHooks, silentLogger);

    await useCase.execute({ branch: "feature/login" });

    expect(merged).toEqual(["develop"]);
  });

  it("rebases onto the base when rebase is requested", async () => {
    const rebased: string[] = [];
    const git = fakeGit({ rebase: async (onto) => void rebased.push(onto) });
    const useCase = new UpdateBranchUseCase(workflow, git, noopHooks, silentLogger);

    await useCase.execute({ branch: "feature/login", rebase: true });

    expect(rebased).toEqual(["develop"]);
  });

  it("checks out the branch before integrating", async () => {
    const checkedOut: string[] = [];
    const git = fakeGit({ checkout: async (b) => void checkedOut.push(b) });
    const useCase = new UpdateBranchUseCase(workflow, git, noopHooks, silentLogger);

    await useCase.execute({ branch: "feature/login" });

    expect(checkedOut).toEqual(["feature/login"]);
  });

  it("fetches configured remotes first when fetch is requested", async () => {
    const fetched: { remote: string; refspec?: string | undefined }[] = [];
    const git = fakeGit({
      fetch: async (remote, refspec) => void fetched.push({ remote, refspec }),
    });
    const useCase = new UpdateBranchUseCase(workflow, git, noopHooks, silentLogger);

    await useCase.execute({ branch: "feature/login", fetch: true });

    expect(fetched).toEqual([{ remote: "origin", refspec: "develop" }]);
  });

  it("throws for a branch that is not a recognised topic branch", async () => {
    const useCase = new UpdateBranchUseCase(workflow, fakeGit(), noopHooks, silentLogger);
    await expect(useCase.execute({ branch: "not-a-topic" })).rejects.toThrow(ValidationError);
  });

  it("wraps a merge failure in a ConflictError with the conflicted files", async () => {
    const git = fakeGit({
      merge: async () => {
        throw new Error("CONFLICT");
      },
      conflictedFiles: async () => ["src/a.ts", "src/b.ts"],
    });
    const useCase = new UpdateBranchUseCase(workflow, git, noopHooks, silentLogger);

    await expect(useCase.execute({ branch: "feature/login" })).rejects.toMatchObject({
      code: "CONFLICT",
      files: ["src/a.ts", "src/b.ts"],
    });
  });

  it("wraps a rebase failure in a ConflictError too", async () => {
    const git = fakeGit({
      rebase: async () => {
        throw new Error("CONFLICT");
      },
      conflictedFiles: async () => ["src/a.ts"],
    });
    const useCase = new UpdateBranchUseCase(workflow, git, noopHooks, silentLogger);

    await expect(useCase.execute({ branch: "feature/login", rebase: true })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("runs pre-update then post-update hooks with the chosen strategy", async () => {
    const hooks = recordingHooks();
    const useCase = new UpdateBranchUseCase(workflow, fakeGit(), hooks, silentLogger);

    await useCase.execute({ branch: "feature/login", rebase: true });

    expect(hooks.calls.map((c) => c.name)).toEqual(["pre-update", "post-update"]);
    expect(hooks.calls[0]?.ctx.extra).toMatchObject({ strategy: "rebase" });
  });
});
