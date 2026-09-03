import { describe, expect, it } from "vitest";
import { DeleteBranchUseCase } from "../../src/application/use-cases/delete-branch.use-case.js";
import { WorkflowService } from "../../src/domain/services/workflow.service.js";
import { classicPreset } from "../../src/domain/config/presets.js";
import { ValidationError } from "../../src/domain/errors/index.js";
import { fakeGit, noopHooks, recordingHooks } from "../helper/test-helpers.js";

describe("DeleteBranchUseCase", () => {
  const workflow = new WorkflowService(classicPreset());

  it("deletes a local topic branch", async () => {
    const deleted: { branch: string; force: boolean }[] = [];
    const git = fakeGit({
      currentBranch: async () => "main",
      deleteBranch: async (branch, force) => void deleted.push({ branch, force: force ?? false }),
    });
    const useCase = new DeleteBranchUseCase(workflow, git, noopHooks);

    await useCase.execute({ branch: "feature/login" });

    expect(deleted).toEqual([{ branch: "feature/login", force: false }]);
  });

  it("checks out the branch's base first when it is currently checked out", async () => {
    const checkedOut: string[] = [];
    const git = fakeGit({
      currentBranch: async () => "feature/login",
      checkout: async (b) => void checkedOut.push(b),
    });
    const useCase = new DeleteBranchUseCase(workflow, git, noopHooks);

    await useCase.execute({ branch: "feature/login" });

    expect(checkedOut).toEqual(["develop"]);
  });

  it("does not switch branches when a different branch is checked out", async () => {
    const checkedOut: string[] = [];
    const git = fakeGit({
      currentBranch: async () => "main",
      checkout: async (b) => void checkedOut.push(b),
    });
    const useCase = new DeleteBranchUseCase(workflow, git, noopHooks);

    await useCase.execute({ branch: "feature/login" });

    expect(checkedOut).toEqual([]);
  });

  it("throws for a branch that does not match any known type", async () => {
    const useCase = new DeleteBranchUseCase(workflow, fakeGit(), noopHooks);
    await expect(useCase.execute({ branch: "random-branch" })).rejects.toThrow(ValidationError);
  });

  it("refuses to delete a branch that is itself a protected base branch", async () => {
    // A workflow where a topic-branch prefix collides with a protected base name.
    const collidingWorkflow = new WorkflowService({
      ...classicPreset(),
      baseBranches: [
        { name: "main", protected: true },
        { name: "release/2.0", base: "main", protected: true },
      ],
      branchTypes: [{ name: "release", base: "main", target: ["main"], prefix: "release/" }],
    });
    const useCase = new DeleteBranchUseCase(collidingWorkflow, fakeGit(), noopHooks);

    await expect(useCase.execute({ branch: "release/2.0" })).rejects.toThrow(ValidationError);
  });

  it("deletes matching remote branches when remote is requested", async () => {
    const deletedRemotes: { remote: string; branch: string }[] = [];
    const git = fakeGit({
      currentBranch: async () => "main",
      remoteBranchExists: async () => true,
      deleteRemoteBranch: async (remote, branch) => void deletedRemotes.push({ remote, branch }),
    });
    const useCase = new DeleteBranchUseCase(workflow, git, noopHooks);

    await useCase.execute({ branch: "feature/login", remote: true });

    expect(deletedRemotes).toEqual([{ remote: "origin", branch: "feature/login" }]);
  });

  it("skips remotes where the branch does not exist", async () => {
    const deletedRemotes: string[] = [];
    const git = fakeGit({
      currentBranch: async () => "main",
      remoteBranchExists: async () => false,
      deleteRemoteBranch: async (remote) => void deletedRemotes.push(remote),
    });
    const useCase = new DeleteBranchUseCase(workflow, git, noopHooks);

    await useCase.execute({ branch: "feature/login", remote: true });

    expect(deletedRemotes).toEqual([]);
  });

  it("runs pre-delete then post-delete hooks with deletion details", async () => {
    const hooks = recordingHooks();
    const git = fakeGit({ currentBranch: async () => "main" });
    const useCase = new DeleteBranchUseCase(workflow, git, hooks);

    await useCase.execute({ branch: "feature/login", force: true });

    expect(hooks.calls.map((c) => c.name)).toEqual(["pre-delete", "post-delete"]);
    expect(hooks.calls[1]?.ctx.extra).toMatchObject({ force: true, deleted: true });
  });
});
