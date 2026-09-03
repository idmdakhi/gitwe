import { describe, expect, it } from "vitest";
import { ListBranchesUseCase } from "../../src/application/use-cases/list-branches.use-case.js";
import { WorkflowService } from "../../src/domain/services/workflow.service.js";
import { classicPreset } from "../../src/domain/config/presets.js";
import { fakeGit } from "../helper/test-helpers.js";

describe("ListBranchesUseCase", () => {
  const workflow = new WorkflowService(classicPreset());

  it("lists and resolves all branches when given no filter", async () => {
    const git = fakeGit({
      listBranches: async () => ["feature/login", "release/1.2.0", "main"],
    });
    const useCase = new ListBranchesUseCase(workflow, git);

    const result = await useCase.execute();

    expect(result.map((b) => b.branch)).toEqual(["feature/login", "release/1.2.0"]);
  });

  it("passes the wildcard glob for the given type through to git", async () => {
    let requestedGlob: string | undefined;
    const git = fakeGit({
      listBranches: async (glob) => {
        requestedGlob = glob;
        return ["feature/login"];
      },
    });
    const useCase = new ListBranchesUseCase(workflow, git);

    await useCase.execute({ typeNameOrAlias: "feature" });

    expect(requestedGlob).toBe("feature/*");
  });

  it("combines a type with a custom pattern", async () => {
    let requestedGlob: string | undefined;
    const git = fakeGit({
      listBranches: async (glob) => {
        requestedGlob = glob;
        return [];
      },
    });
    const useCase = new ListBranchesUseCase(workflow, git);

    await useCase.execute({ typeNameOrAlias: "feature", pattern: "auth-*" });

    expect(requestedGlob).toBe("feature/auth-*");
  });

  it("uses just the pattern when no type is given", async () => {
    let requestedGlob: string | undefined;
    const git = fakeGit({
      listBranches: async (glob) => {
        requestedGlob = glob;
        return [];
      },
    });
    const useCase = new ListBranchesUseCase(workflow, git);

    await useCase.execute({ pattern: "hotfix/*" });

    expect(requestedGlob).toBe("hotfix/*");
  });

  it("filters out branches that don't resolve to a known type", async () => {
    const git = fakeGit({
      listBranches: async () => ["feature/login", "not-a-topic-branch"],
    });
    const useCase = new ListBranchesUseCase(workflow, git);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(result[0]?.branch).toBe("feature/login");
  });
});
