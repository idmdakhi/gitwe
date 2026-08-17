import type { WorkflowConfig } from "../../domain/entities/workflow-config.entity.js";

/** Classic git-flow: main + develop, with feature/release/hotfix/support. */
export function classicPreset(): WorkflowConfig {
  return {
    version: 1,
    name: "classic",
    baseBranches: [
      { name: "main", aliases: ["master"], protected: true },
      { name: "develop", aliases: ["dev"], base: "main", protected: true },
    ],
    branchTypes: [
      {
        name: "feature",
        aliases: ["feat"],
        base: "develop",
        target: ["develop"],
        prefix: "feature/",
      },
      {
        name: "release",
        aliases: ["rel"],
        base: "develop",
        target: ["main", "develop"],
        prefix: "release/",
      },
      {
        name: "hotfix",
        aliases: ["fix"],
        base: "main",
        target: ["main", "develop"],
        prefix: "hotfix/",
      },
      { name: "support", aliases: ["lts"], base: "main", target: ["main"], prefix: "support/" },
    ],
    merge: {
      strategy: "merge",
      deleteOnFinish: ["feature", "release", "hotfix"],
      squash: { enabled: true, default: false, branchTypes: ["feature"] },
    },
    hooks: { enabled: true, path: ".gitwe/hooks" },
    versioning: {
      enabled: true,
      tagPrefix: "v",
      tagTypes: ["release", "hotfix"],
      bumpRules: { minor: ["release"], patch: ["hotfix"] },
    },
    remote: {
      name: "origin",
      autoFetch: true,
      fetch: ["origin"],
      autoPush: false,
      push: ["origin"],
    },
  };
}

/** GitHub Flow: a single long-lived main branch, feature/bugfix topics rebased in. */
export function githubPreset(): WorkflowConfig {
  return {
    version: 1,
    name: "github",
    baseBranches: [{ name: "main", protected: true }],
    branchTypes: [
      { name: "feature", aliases: ["feat"], base: "main", target: ["main"], prefix: "feature/" },
      { name: "bugfix", aliases: ["fix"], base: "main", target: ["main"], prefix: "bugfix/" },
    ],
    merge: { strategy: "squash", deleteOnFinish: ["feature", "bugfix"] },
    remote: {
      name: "origin",
      autoFetch: true,
      fetch: ["origin"],
      autoPush: false,
      push: ["origin"],
    },
  };
}

/** GitLab Flow: main -> staging -> production, plus feature/hotfix topics. */
export function gitlabPreset(): WorkflowConfig {
  return {
    version: 1,
    name: "gitlab",
    baseBranches: [
      { name: "main", protected: true },
      { name: "staging", base: "main" },
      { name: "production", base: "staging", protected: true },
    ],
    branchTypes: [
      { name: "feature", aliases: ["feat"], base: "main", target: ["main"], prefix: "feature/" },
      {
        name: "hotfix",
        aliases: ["fix"],
        base: "production",
        target: ["production", "main"],
        prefix: "hotfix/",
      },
    ],
    merge: { strategy: "merge", deleteOnFinish: ["feature", "hotfix"] },
    remote: {
      name: "origin",
      autoFetch: true,
      fetch: ["origin"],
      autoPush: false,
      push: ["origin"],
    },
  };
}

export const presets = {
  classic: classicPreset,
  github: githubPreset,
  gitlab: gitlabPreset,
} as const;

export type PresetName = keyof typeof presets;
