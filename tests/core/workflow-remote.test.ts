import { describe, expect, it } from "vitest";
import { normaliseRemote } from "../../src/domain/remote.js";
import {
  workflowResolvePushRemotes,
  workflowResolveFetchRemotes,
  workflowDefaultRemote,
  type WorkflowConfigLike,
} from "../../src/domain/workflow-remote.js";

function makeConfig(overrides: Partial<WorkflowConfigLike> = {}): WorkflowConfigLike {
  return {
    remote: normaliseRemote({
      name: "origin",
      fetch: ["origin"],
      push: ["origin", "mirror"],
    }),
    baseBranches: [{ name: "main" }, { name: "develop", remote: "develop-remote" }],
    branchTypes: [
      { name: "feature", base: "develop" },
      { name: "release", base: "develop", pushRemote: "release-origin" },
      { name: "hotfix", base: "main", pushRemote: ["origin", "backup"] },
    ],
    ...overrides,
  };
}

describe("workflowResolvePushRemotes", () => {
  it("uses topic pushRemote when set (string)", () => {
    const config = makeConfig();
    const release = config.branchTypes.find((t) => t.name === "release")!;
    expect(workflowResolvePushRemotes(config, release)).toEqual(["release-origin"]);
  });

  it("uses topic pushRemote when set (array)", () => {
    const config = makeConfig();
    const hotfix = config.branchTypes.find((t) => t.name === "hotfix")!;
    expect(workflowResolvePushRemotes(config, hotfix)).toEqual(["origin", "backup"]);
  });

  it("falls back to parent base.remote", () => {
    const config = makeConfig();
    const feature = config.branchTypes.find((t) => t.name === "feature")!;
    // feature has no pushRemote, parent develop has remote: develop-remote
    expect(workflowResolvePushRemotes(config, feature)).toEqual(["develop-remote"]);
  });

  it("falls back to workflow.remote.push when no overrides", () => {
    const config = makeConfig({
      baseBranches: [{ name: "main" }, { name: "develop" }], // no remote on develop
    });
    const feature = config.branchTypes.find((t) => t.name === "feature")!;
    expect(workflowResolvePushRemotes(config, feature)).toEqual(["origin", "mirror"]);
  });
});

describe("workflowResolveFetchRemotes", () => {
  it("returns workflow fetch list", () => {
    const config = makeConfig();
    expect(workflowResolveFetchRemotes(config)).toEqual(["origin"]);
  });
});

describe("workflowDefaultRemote", () => {
  it("returns the default remote name", () => {
    const config = makeConfig();
    expect(workflowDefaultRemote(config)).toBe("origin");
  });
});
