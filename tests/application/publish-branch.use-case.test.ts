import { describe, expect, it } from "vitest";
import { PublishBranchUseCase } from "../../src/application/use-cases/publish-branch.use-case.js";
import { WorkflowService } from "../../src/domain/services/workflow.service.js";
import { classicPreset } from "../../src/domain/config/presets.js";
import { silentLogger } from "../../src/domain/ports/logger.port.js";
import { ValidationError } from "../../src/domain/errors/index.js";
import { fakeGit, noopHooks, recordingHooks } from "../helper/test-helpers.js";
import type { PushOptions } from "../../src/domain/ports/git-repository.port.js";

describe("PublishBranchUseCase", () => {
  const workflow = new WorkflowService(classicPreset());

  it("pushes the branch to every configured remote and sets upstream", async () => {
    const pushed: { remote: string; branch: string; options?: PushOptions }[] = [];
    const git = fakeGit({
      push: async (remote, branch, options) => void pushed.push({ remote, branch, options }),
    });
    const useCase = new PublishBranchUseCase(workflow, git, noopHooks, silentLogger);

    const remotes = await useCase.execute({ branch: "feature/login" });

    expect(remotes).toEqual(["origin"]);
    expect(pushed).toHaveLength(1);
    expect(pushed[0]?.remote).toBe("origin");
    expect(pushed[0]?.branch).toBe("feature/login");
    expect(pushed[0]?.options).toMatchObject({ setUpstream: true });
  });

  it("throws for a branch that is not a recognised topic branch", async () => {
    const useCase = new PublishBranchUseCase(workflow, fakeGit(), noopHooks, silentLogger);
    await expect(useCase.execute({ branch: "not-a-topic" })).rejects.toThrow(ValidationError);
  });

  it("throws when the branch does not exist locally", async () => {
    const git = fakeGit({ branchExists: async () => false });
    const useCase = new PublishBranchUseCase(workflow, git, noopHooks, silentLogger);
    await expect(useCase.execute({ branch: "feature/login" })).rejects.toThrow(ValidationError);
  });

  it("throws when a configured remote is not set up", async () => {
    const git = fakeGit({ remoteExists: async () => false });
    const useCase = new PublishBranchUseCase(workflow, git, noopHooks, silentLogger);
    await expect(useCase.execute({ branch: "feature/login" })).rejects.toThrow(ValidationError);
  });

  it("forces the push and skips force-with-lease when force is requested", async () => {
    const pushed: (PushOptions | undefined)[] = [];
    const git = fakeGit({ push: async (_r, _b, options) => void pushed.push(options) });
    const useCase = new PublishBranchUseCase(workflow, git, noopHooks, silentLogger);

    await useCase.execute({ branch: "feature/login", force: true });

    expect(pushed[0]).toMatchObject({ force: true, forceWithLease: undefined });
  });

  it("runs pre-publish then post-publish hooks with remote details", async () => {
    const hooks = recordingHooks();
    const useCase = new PublishBranchUseCase(workflow, fakeGit(), hooks, silentLogger);

    await useCase.execute({ branch: "feature/login" });

    expect(hooks.calls.map((c) => c.name)).toEqual(["pre-publish", "post-publish"]);
    expect(hooks.calls[0]?.ctx.remote).toBe("origin");
    expect(hooks.calls[1]?.ctx.extra).toMatchObject({ remotes: ["origin"] });
  });
});
