import { describe, expect, it } from "vitest";

import { Workflow } from "../../../src/domain/workflow.js";
import type { BranchType, WorkflowConfig } from "../../../src/domain/entities.js";

describe("Workflow.versionBumpFor", () => {
  const branchTypes: BranchType[] = [
    {
      name: "feature",
      base: "develop",
      target: ["develop"],
      prefix: "feature/",
    },
    {
      name: "release",
      base: "develop",
      target: ["main", "develop"],
      prefix: "release/",
    },
    {
      name: "hotfix",
      base: "main",
      target: ["main", "develop"],
      prefix: "hotfix/",
    },
    {
      name: "breaking",
      base: "main",
      target: ["main"],
      prefix: "breaking/",
    },
    {
      name: "preview",
      base: "develop",
      target: ["develop"],
      prefix: "preview/",
    },
  ];

  const createWorkflow = (
    bumpRules: NonNullable<WorkflowConfig["versioning"]>["bumpRules"],
    enabled = true,
  ): Workflow => {
    const config = {
      name: "test",
      version: 1,
      baseBranches: [
        {
          name: "main",
          aliases: [],
          protected: true,
        },
        {
          name: "develop",
          aliases: [],
          base: "main",
          protected: true,
        },
      ],
      branchTypes,
      versioning: {
        enabled,
        bumpRules,
        tagPrefix: "v",
        tag: ["release", "hotfix"],
        path: ".gitwe/VERSION.yaml",
        autoCommit: true,
        commitMessage: "chore: bump version to {{version}}",
        initialVersion: "0.1.0",
      },

      remote: {
        name: "origin",
        autoPush: false,
        autoFetch: true,
      },
    } satisfies WorkflowConfig;

    return new Workflow(config);
  };

  it("returns major for a branch listed in major rules", () => {
    const workflow = createWorkflow({
      major: ["breaking"],
      minor: ["release"],
      patch: ["hotfix"],
    });

    const type = branchTypes.find((branch) => branch.name === "breaking")!;

    expect(workflow.versionBumpFor(type)).toBe("major");
  });

  it("returns minor for a branch listed in minor rules", () => {
    const workflow = createWorkflow({
      major: [],
      minor: ["release"],
      patch: ["hotfix"],
    });

    const type = branchTypes.find((branch) => branch.name === "release")!;

    expect(workflow.versionBumpFor(type)).toBe("minor");
  });

  it("returns patch for a branch listed in patch rules", () => {
    const workflow = createWorkflow({
      major: [],
      minor: ["release"],
      patch: ["hotfix"],
    });

    const type = branchTypes.find((branch) => branch.name === "hotfix")!;

    expect(workflow.versionBumpFor(type)).toBe("patch");
  });

  it("returns prerelease for a branch listed in prerelease rules", () => {
    const workflow = createWorkflow({
      major: [],
      minor: [],
      patch: [],
      prerelease: ["preview"],
    });

    const type = branchTypes.find((branch) => branch.name === "preview")!;

    expect(workflow.versionBumpFor(type)).toBe("prerelease");
  });

  it("returns none when the branch is not configured", () => {
    const workflow = createWorkflow({
      major: ["breaking"],
      minor: ["release"],
      patch: ["hotfix"],
    });

    const type = branchTypes.find((branch) => branch.name === "feature")!;

    expect(workflow.versionBumpFor(type)).toBe("none");
  });

  it("returns none when versioning is disabled", () => {
    const workflow = createWorkflow(
      {
        major: ["breaking"],
        minor: ["release"],
        patch: ["hotfix"],
      },
      false,
    );

    const type = branchTypes.find((branch) => branch.name === "release")!;

    expect(workflow.versionBumpFor(type)).toBe("none");
  });

  it("returns none when bumpRules are missing", () => {
    const workflow = createWorkflow(undefined);

    const type = branchTypes.find((branch) => branch.name === "release")!;

    expect(workflow.versionBumpFor(type)).toBe("none");
  });

  it("prioritizes major over minor and patch", () => {
    const workflow = createWorkflow({
      major: ["release"],
      minor: ["release"],
      patch: ["release"],
    });

    const type = branchTypes.find((branch) => branch.name === "release")!;

    expect(workflow.versionBumpFor(type)).toBe("major");
  });

  it("prioritizes minor over patch", () => {
    const workflow = createWorkflow({
      major: [],
      minor: ["release"],
      patch: ["release"],
    });

    const type = branchTypes.find((branch) => branch.name === "release")!;

    expect(workflow.versionBumpFor(type)).toBe("minor");
  });

  it("supports multiple branch types in the same rule", () => {
    const workflow = createWorkflow({
      major: ["breaking"],
      minor: ["release", "feature"],
      patch: ["hotfix"],
    });

    const release = branchTypes.find((branch) => branch.name === "release")!;
    const feature = branchTypes.find((branch) => branch.name === "feature")!;
    const hotfix = branchTypes.find((branch) => branch.name === "hotfix")!;

    expect(workflow.versionBumpFor(release)).toBe("minor");
    expect(workflow.versionBumpFor(feature)).toBe("minor");
    expect(workflow.versionBumpFor(hotfix)).toBe("patch");
  });
});
