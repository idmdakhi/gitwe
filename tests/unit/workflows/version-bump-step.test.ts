import { describe, expect, it } from "vitest";

import type { BranchType, WorkflowConfig } from "../../../src/domain/entities.js";
import { Workflow } from "../../../src/domain/workflow.js";

const branch = (name: string): BranchType => ({
  name,
  base: "develop",
  target: ["develop"],
  prefix: `${name}/`,
});

const createConfig = (
  bumpRules: NonNullable<NonNullable<WorkflowConfig["versioning"]>["bumpRules"]>,
  enabled = true,
): WorkflowConfig => {
  return {
    name: "test",
    version: 1,

    baseBranches: [
      {
        name: "main",
        protected: true,
      },
      {
        name: "develop",
        base: "main",
        protected: true,
      },
    ],

    branchTypes: [
      branch("feature"),
      branch("release"),
      branch("hotfix"),
      branch("breaking"),
      branch("preview"),
    ],

    versioning: {
      enabled,
      tagPrefix: "v",
      tag: ["release", "hotfix"],
      bumpRules,
      path: ".gitwe/VERSION.yaml",
      autoCommit: true,
      commitMessage: "chore: bump version to {{version}}",
      initialVersion: "0.1.0",
    },
  };
};

const createWorkflow = (
  bumpRules: NonNullable<NonNullable<WorkflowConfig["versioning"]>["bumpRules"]>,
  enabled = true,
): Workflow => {
  return new Workflow(createConfig(bumpRules, enabled));
};

const getBranch = (workflow: Workflow, name: string): BranchType => {
  const type = workflow.findBranchType(name);

  if (!type) {
    throw new Error(`Unknown branch type: ${name}`);
  }

  return type;
};

describe("Workflow.versionBumpFor", () => {
  describe("major", () => {
    it("returns major when branch type is configured as major", () => {
      const workflow = createWorkflow({
        major: ["breaking"],
        minor: [],
        patch: [],
      });

      expect(workflow.versionBumpFor(getBranch(workflow, "breaking"))).toBe("major");
    });
  });

  describe("minor", () => {
    it("returns minor when branch type is configured as minor", () => {
      const workflow = createWorkflow({
        major: [],
        minor: ["release"],
        patch: [],
      });

      expect(workflow.versionBumpFor(getBranch(workflow, "release"))).toBe("minor");
    });
  });

  describe("patch", () => {
    it("returns patch when branch type is configured as patch", () => {
      const workflow = createWorkflow({
        major: [],
        minor: [],
        patch: ["hotfix"],
      });

      expect(workflow.versionBumpFor(getBranch(workflow, "hotfix"))).toBe("patch");
    });
  });

  describe("prerelease", () => {
    it("returns prerelease when branch type is configured as prerelease", () => {
      const workflow = createWorkflow({
        major: [],
        minor: [],
        patch: [],
        prerelease: ["preview"],
      });

      expect(workflow.versionBumpFor(getBranch(workflow, "preview"))).toBe("prerelease");
    });
  });

  describe("none", () => {
    it("returns none when branch type is not configured", () => {
      const workflow = createWorkflow({
        major: ["breaking"],
        minor: ["release"],
        patch: ["hotfix"],
      });

      expect(workflow.versionBumpFor(getBranch(workflow, "feature"))).toBe("none");
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

      expect(workflow.versionBumpFor(getBranch(workflow, "release"))).toBe("none");
    });

    it("returns none when bump rules are empty", () => {
      const workflow = createWorkflow({});

      expect(workflow.versionBumpFor(getBranch(workflow, "release"))).toBe("none");
    });
  });

  describe("rule priority", () => {
    it("prioritizes major over minor and patch", () => {
      const workflow = createWorkflow({
        major: ["release"],
        minor: ["release"],
        patch: ["release"],
      });

      expect(workflow.versionBumpFor(getBranch(workflow, "release"))).toBe("major");
    });

    it("prioritizes minor over patch", () => {
      const workflow = createWorkflow({
        major: [],
        minor: ["release"],
        patch: ["release"],
      });

      expect(workflow.versionBumpFor(getBranch(workflow, "release"))).toBe("minor");
    });

    it("prioritizes patch over prerelease", () => {
      const workflow = createWorkflow({
        major: [],
        minor: [],
        patch: ["release"],
        prerelease: ["release"],
      });

      expect(workflow.versionBumpFor(getBranch(workflow, "release"))).toBe("patch");
    });
  });

  describe("multiple branch types", () => {
    it("applies rules independently to different branch types", () => {
      const workflow = createWorkflow({
        major: ["breaking"],
        minor: ["release", "feature"],
        patch: ["hotfix"],
        prerelease: ["preview"],
      });

      expect(workflow.versionBumpFor(getBranch(workflow, "breaking"))).toBe("major");

      expect(workflow.versionBumpFor(getBranch(workflow, "release"))).toBe("minor");

      expect(workflow.versionBumpFor(getBranch(workflow, "feature"))).toBe("minor");

      expect(workflow.versionBumpFor(getBranch(workflow, "hotfix"))).toBe("patch");

      expect(workflow.versionBumpFor(getBranch(workflow, "preview"))).toBe("prerelease");
    });
  });

  describe("default project rules", () => {
    it("uses release as minor bump", () => {
      const workflow = createWorkflow({
        major: [],
        minor: ["release"],
        patch: ["hotfix"],
      });

      expect(workflow.versionBumpFor(getBranch(workflow, "release"))).toBe("minor");
    });

    it("uses hotfix as patch bump", () => {
      const workflow = createWorkflow({
        major: [],
        minor: ["release"],
        patch: ["hotfix"],
      });

      expect(workflow.versionBumpFor(getBranch(workflow, "hotfix"))).toBe("patch");
    });

    it("does not bump feature branches by default", () => {
      const workflow = createWorkflow({
        major: [],
        minor: ["release"],
        patch: ["hotfix"],
      });

      expect(workflow.versionBumpFor(getBranch(workflow, "feature"))).toBe("none");
    });
  });
});
