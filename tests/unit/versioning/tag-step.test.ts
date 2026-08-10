import { describe, expect, it, vi } from "vitest";

import { TagStep } from "../../../src/application/workflows/finish-workflow.js";

function createFakeGit(options: { tagExists?: boolean } = {}) {
  return {
    tagExists: vi.fn().mockResolvedValue(options.tagExists ?? false),
    createTag: vi.fn().mockResolvedValue(undefined),
    deleteTag: vi.fn().mockResolvedValue(undefined),
    parseVersion: vi.fn().mockReturnValue({
      major: 1,
      minor: 1,
      patch: 0,
    }),
    renderTagName: vi.fn().mockReturnValue("v1.1.0"),
  };
}

function createContext({
  git,
  branchType = "release",
  targets = ["main"],
  versionBump = {
    current: "1.0.0",
    new: "1.1.0",
    type: "minor",
    message: "chore: bump version to 1.1.0",
    committed: true,
  },
}: {
  git: ReturnType<typeof createFakeGit>;
  branchType?: "release" | "hotfix" | "feature";
  targets?: string[];
  versionBump?: any;
}) {
  const branchConfig = {
    release: {
      name: "release",
      prefix: "release/",
      base: "main",
      target: ["main", "develop"],
    },
    hotfix: {
      name: "hotfix",
      prefix: "hotfix/",
      base: "main",
      target: ["main", "develop"],
    },
    feature: {
      name: "feature",
      prefix: "feature/",
      base: "develop",
      target: ["develop"],
    },
  }[branchType];

  return {
    engineContext: {
      git,

      workflow: {
        config: {
          versioning: {
            enabled: true,

            // این لیست نوع branch است، نه نام base branch
            tag: ["release", "hotfix"],

            tagPrefix: "v",
            annotated: true,
          },
        },

        shouldTag: vi.fn(
          (type: { name: string }) => type.name === "release" || type.name === "hotfix",
        ),

        shouldCreateTag: vi.fn((branchName: string) => {
          return branchName === "release" || branchName === "hotfix";
        }),

        tagPrefixFor: vi.fn(() => "v"),

        requireBranchType: vi.fn((value: string) => value),
      },

      logger: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    },

    resolvedBranch: {
      branch: `${branchConfig.prefix}1.1.0`,
      shortName: "1.1.0",
      type: branchConfig,
    },

    state: {
      data: {
        branch: `${branchConfig.prefix}1.1.0`,
        branchType,
        targets,
        versionBump,
        options: {},
      },
    },
  } as any;
}

describe("TagStep", () => {
  it("creates release tag for release branch", async () => {
    const git = createFakeGit();

    const context = createContext({
      git,
      branchType: "release",
      targets: ["main", "develop"],
    });

    const step = new TagStep();

    expect(await step.canExecute(context)).toBe(true);

    await step.execute(context);

    expect(git.createTag).toHaveBeenCalledWith(
      "v1.1.0",
      expect.objectContaining({
        message: "chore: bump version to 1.1.0",
      }),
    );

    expect(context.state.data.tag).toBe("v1.1.0");

    expect(context.engineContext.workflow.shouldTag).toHaveBeenCalledWith(
      context.resolvedBranch.type,
    );
  });

  it("does not create tag for feature branch", async () => {
    const git = createFakeGit();

    const context = createContext({
      git,
      branchType: "feature",
      targets: ["develop"],
    });

    const step = new TagStep();

    expect(await step.canExecute(context)).toBe(false);

    expect(git.createTag).not.toHaveBeenCalled();
  });

  it("creates tag for hotfix branch", async () => {
    const git = createFakeGit();

    const context = createContext({
      git,
      branchType: "hotfix",
      targets: ["main"],
      versionBump: {
        current: "1.1.0",
        new: "1.1.1",
        type: "patch",
        message: "chore: bump version to 1.1.1",
        committed: true,
      },
    });

    git.renderTagName.mockReturnValue("v1.1.1");

    const step = new TagStep();

    expect(await step.canExecute(context)).toBe(true);

    await step.execute(context);

    expect(git.createTag).toHaveBeenCalledWith(
      "v1.1.1",
      expect.objectContaining({
        message: "chore: bump version to 1.1.1",
      }),
    );

    expect(context.state.data.tag).toBe("v1.1.1");
  });

  it("fails when tag already exists", async () => {
    const git = createFakeGit({
      tagExists: true,
    });

    const context = createContext({
      git,
      branchType: "release",
    });

    const step = new TagStep();

    await expect(step.execute(context)).rejects.toThrow("Tag already exists: v1.1.0");

    expect(git.createTag).not.toHaveBeenCalled();
  });

  it("does not execute when versioning is disabled", async () => {
    const git = createFakeGit();

    const context = createContext({
      git,
      branchType: "release",
    });

    context.engineContext.workflow.config.versioning.enabled = false;

    const step = new TagStep();

    expect(await step.canExecute(context)).toBe(false);

    expect(git.createTag).not.toHaveBeenCalled();
  });
});
