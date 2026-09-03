import { describe, expect, it } from "vitest";
import { OverviewUseCase } from "../../src/application/use-cases/overview.use-case.js";
import { WorkflowService } from "../../src/domain/services/workflow.service.js";
import { classicPreset } from "../../src/domain/config/presets.js";
import { fakeGit } from "../helper/test-helpers.js";

describe("OverviewUseCase", () => {
  const workflow = new WorkflowService(classicPreset());

  it("reports the workflow name and configured base branches", async () => {
    const useCase = new OverviewUseCase(workflow, fakeGit());

    const overview = await useCase.execute();

    expect(overview.workflowName).toBe("classic");
    expect(overview.baseBranches).toEqual(["main", "develop"]);
  });

  it("includes the current branch when one is checked out", async () => {
    const git = fakeGit({ currentBranch: async () => "feature/login" });
    const useCase = new OverviewUseCase(workflow, git);

    const overview = await useCase.execute();

    expect(overview.currentBranch).toBe("feature/login");
  });

  it("omits currentBranch when detached or unavailable", async () => {
    const git = fakeGit({ currentBranch: async () => undefined });
    const useCase = new OverviewUseCase(workflow, git);

    const overview = await useCase.execute();

    expect(overview.currentBranch).toBeUndefined();
    expect("currentBranch" in overview).toBe(false);
  });

  it("counts branches per configured type", async () => {
    const git = fakeGit({
      listBranches: async (glob) => {
        if (glob === "feature/*") return ["feature/a", "feature/b"];
        if (glob === "release/*") return ["release/1.0.0"];
        return [];
      },
    });
    const useCase = new OverviewUseCase(workflow, git);

    const overview = await useCase.execute();

    const feature = overview.branchTypes.find((t) => t.type === "feature");
    const release = overview.branchTypes.find((t) => t.type === "release");
    const hotfix = overview.branchTypes.find((t) => t.type === "hotfix");

    expect(feature).toMatchObject({ base: "develop", target: ["develop"], count: 2 });
    expect(release).toMatchObject({ base: "develop", target: ["main", "develop"], count: 1 });
    expect(hotfix).toMatchObject({ count: 0 });
  });

  it("includes every branch type from the workflow, even with zero branches", async () => {
    const git = fakeGit({ listBranches: async () => [] });
    const useCase = new OverviewUseCase(workflow, git);

    const overview = await useCase.execute();

    expect(overview.branchTypes.map((t) => t.type)).toEqual([
      "feature",
      "release",
      "hotfix",
      "support",
    ]);
  });
});
