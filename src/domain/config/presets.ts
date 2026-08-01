// src/domain/presets.ts
// کارخانه‌های ساخت WorkflowConfig برای گردش‌های کاری رایج
import type { WorkflowConfig } from "../entities.js";

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

// ---- پیاده‌سازی پریست‌ها ----
function classic(overrides: PresetOverrides): WorkflowConfig {
  const main = overrides.main ?? "main";
  const develop = overrides.develop ?? "develop";
  return {
    version: 1,
    name: "classic",
    remote: overrides.remote ?? "origin",
    tagPrefix: overrides.tagPrefix ?? "v",
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
        prefix: overrides.prefixes?.feature ?? "feature/",
        upstreamStrategy: "merge",
        downstreamStrategy: "merge",
        tag: false,
        deleteOnFinish: true,
      },
      {
        name: "bugfix",
        parent: develop,
        prefix: overrides.prefixes?.bugfix ?? "bugfix/",
        upstreamStrategy: "merge",
        downstreamStrategy: "merge",
        tag: false,
        deleteOnFinish: true,
      },
      {
        name: "release",
        parent: main,
        startPoint: develop,
        prefix: overrides.prefixes?.release ?? "release/",
        upstreamStrategy: "merge",
        downstreamStrategy: "merge",
        tag: true,
        deleteOnFinish: true,
      },
      {
        name: "hotfix",
        parent: main,
        prefix: overrides.prefixes?.hotfix ?? "hotfix/",
        upstreamStrategy: "merge",
        downstreamStrategy: "merge",
        tag: true,
        deleteOnFinish: true,
      },
      {
        name: "support",
        parent: main,
        prefix: overrides.prefixes?.support ?? "support/",
        upstreamStrategy: "merge",
        downstreamStrategy: "merge",
        tag: false,
        deleteOnFinish: false,
      },
    ],
  };
}

function github(overrides: PresetOverrides): WorkflowConfig {
  const main = overrides.main ?? "main";
  return {
    version: 1,
    name: "github",
    remote: overrides.remote ?? "origin",
    tagPrefix: overrides.tagPrefix ?? "v",
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
        prefix: overrides.prefixes?.feature ?? "feature/",
        upstreamStrategy: "merge",
        downstreamStrategy: "rebase",
        tag: false,
        deleteOnFinish: true,
      },
      {
        name: "bugfix",
        parent: main,
        prefix: overrides.prefixes?.bugfix ?? "bugfix/",
        upstreamStrategy: "merge",
        downstreamStrategy: "rebase",
        tag: false,
        deleteOnFinish: true,
      },
    ],
  };
}

function gitlab(overrides: PresetOverrides): WorkflowConfig {
  const main = overrides.main ?? "main";
  const staging = overrides.staging ?? "staging";
  const production = overrides.production ?? "production";
  return {
    version: 1,
    name: "gitlab",
    remote: overrides.remote ?? "origin",
    tagPrefix: overrides.tagPrefix ?? "v",
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
        prefix: overrides.prefixes?.feature ?? "feature/",
        upstreamStrategy: "merge",
        downstreamStrategy: "merge",
        tag: false,
        deleteOnFinish: true,
      },
      {
        name: "hotfix",
        parent: production,
        prefix: overrides.prefixes?.hotfix ?? "hotfix/",
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
