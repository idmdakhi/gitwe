import type { WorkflowConfig } from "../types.js";

export type PresetName = "classic" | "github" | "gitlab";

export const PRESET_NAMES: PresetName[] = ["classic", "github", "gitlab"];

export interface PresetOverrides {
  main?: string;
  develop?: string;
  production?: string;
  staging?: string;
  prefixes?: Record<string, string>;
  tagPrefix?: string;
  remote?: string;
}

/**
 * Classic git-flow: `main` is the trunk, `develop` auto-updates from it, and
 * release/hotfix branches are finished into `main` with a tag.
 */
function classic(o: PresetOverrides): WorkflowConfig {
  const main = o.main ?? "main";
  const develop = o.develop ?? "develop";
  return {
    version: 1,
    name: "classic",
    remote: o.remote ?? "origin",
    tagPrefix: o.tagPrefix ?? "v",
    hooks: { enabled: true, path: ".gitwe/hooks" },
    baseBranches: [
      {
        name: main,
        upstreamStrategy: "merge",
        downstreamStrategy: "merge",
        autoUpdate: false,
      },
      {
        name: develop,
        parent: main,
        upstreamStrategy: "merge",
        downstreamStrategy: "merge",
        autoUpdate: true,
      },
    ],
    topicTypes: [
      {
        name: "feature",
        parent: develop,
        prefix: o.prefixes?.feature ?? "feature/",
        upstreamStrategy: "merge",
        downstreamStrategy: "merge",
        tag: false,
        deleteOnFinish: true,
      },
      {
        name: "bugfix",
        parent: develop,
        prefix: o.prefixes?.bugfix ?? "bugfix/",
        upstreamStrategy: "merge",
        downstreamStrategy: "merge",
        tag: false,
        deleteOnFinish: true,
      },
      {
        name: "release",
        parent: main,
        startPoint: develop,
        prefix: o.prefixes?.release ?? "release/",
        upstreamStrategy: "merge",
        downstreamStrategy: "merge",
        tag: true,
        deleteOnFinish: true,
      },
      {
        name: "hotfix",
        parent: main,
        prefix: o.prefixes?.hotfix ?? "hotfix/",
        upstreamStrategy: "merge",
        downstreamStrategy: "merge",
        tag: true,
        deleteOnFinish: true,
      },
      {
        name: "support",
        parent: main,
        prefix: o.prefixes?.support ?? "support/",
        upstreamStrategy: "merge",
        downstreamStrategy: "merge",
        tag: false,
        deleteOnFinish: false,
      },
    ],
  };
}

/** GitHub flow: a single trunk plus short-lived feature branches. */
function github(o: PresetOverrides): WorkflowConfig {
  const main = o.main ?? "main";
  return {
    version: 1,
    name: "github",
    remote: o.remote ?? "origin",
    tagPrefix: o.tagPrefix ?? "v",
    hooks: { enabled: true, path: ".gitwe/hooks" },
    baseBranches: [
      {
        name: main,
        upstreamStrategy: "merge",
        downstreamStrategy: "merge",
        autoUpdate: false,
      },
    ],
    topicTypes: [
      {
        name: "feature",
        parent: main,
        prefix: o.prefixes?.feature ?? "feature/",
        upstreamStrategy: "merge",
        downstreamStrategy: "rebase",
        tag: false,
        deleteOnFinish: true,
      },
      {
        name: "bugfix",
        parent: main,
        prefix: o.prefixes?.bugfix ?? "bugfix/",
        upstreamStrategy: "merge",
        downstreamStrategy: "rebase",
        tag: false,
        deleteOnFinish: true,
      },
    ],
  };
}

/** GitLab flow: trunk plus environment branches that track it downstream. */
function gitlab(o: PresetOverrides): WorkflowConfig {
  const main = o.main ?? "main";
  const staging = o.staging ?? "staging";
  const production = o.production ?? "production";
  return {
    version: 1,
    name: "gitlab",
    remote: o.remote ?? "origin",
    tagPrefix: o.tagPrefix ?? "v",
    hooks: { enabled: true, path: ".gitwe/hooks" },
    baseBranches: [
      {
        name: main,
        upstreamStrategy: "merge",
        downstreamStrategy: "merge",
        autoUpdate: false,
      },
      {
        name: staging,
        parent: main,
        upstreamStrategy: "merge",
        downstreamStrategy: "merge",
        autoUpdate: true,
      },
      {
        name: production,
        parent: staging,
        upstreamStrategy: "merge",
        downstreamStrategy: "merge",
        autoUpdate: false,
      },
    ],
    topicTypes: [
      {
        name: "feature",
        parent: main,
        prefix: o.prefixes?.feature ?? "feature/",
        upstreamStrategy: "merge",
        downstreamStrategy: "merge",
        tag: false,
        deleteOnFinish: true,
      },
      {
        name: "hotfix",
        parent: production,
        prefix: o.prefixes?.hotfix ?? "hotfix/",
        upstreamStrategy: "merge",
        downstreamStrategy: "merge",
        tag: true,
        deleteOnFinish: true,
      },
    ],
  };
}

const builders: Record<PresetName, (o: PresetOverrides) => WorkflowConfig> = {
  classic,
  github,
  gitlab,
};

export function isPresetName(value: string): value is PresetName {
  return PRESET_NAMES.includes(value as PresetName);
}

export function createPreset(name: PresetName, overrides: PresetOverrides = {}): WorkflowConfig {
  return builders[name](overrides);
}
