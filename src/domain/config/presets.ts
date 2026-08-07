import type { WorkflowConfig } from "../entities.js";

export type PresetName = "classic" | "github" | "gitlab";
export const PRESET_NAMES: PresetName[] = ["classic", "github", "gitlab"];

export interface PresetOverrides {
  main?: string;
  develop?: string;
  production?: string;
  staging?: string;
  remoteName?: string;
  remoteAutoPush?: boolean;
  remoteAutoFetch?: boolean;
  // Version overrides
  tagPrefix?: string;
  versionEnabled?: boolean;
  versionTag?: string[];
  versionBranchTypes?: {
    version?: string[];
    major?: string[];
    minor?: string[];
    patch?: string[];
    metadata?: string[];
  };
  // Prefix overrides for branch types
  prefixes?: Record<string, string>;
  // Base branch overrides for branch types
  bases?: Record<string, string>;
  // Target branch overrides for branch types (comma-separated string)
  targets?: Record<string, string>;
}

function classic(overrides: PresetOverrides): WorkflowConfig {
  const main = overrides.main ?? "main";
  const develop = overrides.develop ?? "develop";

  const getBase = (name: string, fallback: string): string => {
    return overrides.bases?.[name] ?? fallback;
  };
  const getTargets = (name: string, fallback: string[]): string[] => {
    const val = overrides.targets?.[name];
    if (val === undefined) return fallback;
    return val
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "");
  };

  return {
    version: 1,
    name: "classic",
    baseBranches: [
      {
        name: main,
        aliases: ["master"],
        protected: true,
      },
      {
        name: develop,
        aliases: ["dev"],
        base: main,
        protected: true,
      },
    ],
    branchTypes: [
      {
        name: "feature",
        aliases: ["feat"],
        base: getBase("feature", develop),
        target: getTargets("feature", [develop]),
        prefix: overrides.prefixes?.feature ?? "feature/",
      },
      {
        name: "release",
        base: getBase("release", develop),
        target: getTargets("release", [main, develop]),
        prefix: overrides.prefixes?.release ?? "release/",
      },
      {
        name: "hotfix",
        aliases: ["fix", "bug", "patch"],
        base: getBase("hotfix", main),
        target: getTargets("hotfix", [main, develop]),
        prefix: overrides.prefixes?.hotfix ?? "hotfix/",
      },
      {
        name: "support",
        base: getBase("support", main),
        target: getTargets("support", [main]),
        prefix: overrides.prefixes?.support ?? "support/",
      },
    ],
    merge: {
      strategy: "merge",
      branchTypes: {},
      deleteOnFinish: ["feature", "release", "hotfix"],
      squash: {
        branchTypes: ["feature"],
        enabled: true,
        default: false,
      },
    },
    cli: {
      enabled: true,
      interactive: true,
      color: true,
      aliases: {
        fs: "finish feature",
        rs: "release start",
        hf: "hotfix start",
        st: "status",
      },
    },
    remote: {
      name: overrides.remoteName ?? "origin",
      autoPush: overrides.remoteAutoPush ?? false,
      autoFetch: overrides.remoteAutoFetch ?? true,
    },
  };
}

function github(overrides: PresetOverrides): WorkflowConfig {
  const main = overrides.main ?? "main";
  return {
    version: 1,
    name: "github",
    baseBranches: [
      {
        name: main,
        aliases: ["master"],
        protected: true,
      },
    ],
    branchTypes: [
      {
        name: "feature",
        aliases: ["feat"],
        base: main,
        target: [main],
        prefix: overrides.prefixes?.feature ?? "feature/",
      },
      {
        name: "bugfix",
        aliases: ["fix", "bug"],
        base: main,
        target: [main],
        prefix: overrides.prefixes?.bugfix ?? "bugfix/",
      },
    ],
    merge: {
      strategy: "merge",
      branchTypes: {},
      deleteOnFinish: ["feature", "bugfix"],
      squash: {
        branchTypes: ["feature"],
        enabled: true,
        default: false,
      },
    },
    remote: {
      name: overrides.remoteName ?? "origin",
      autoPush: overrides.remoteAutoPush ?? false,
      autoFetch: overrides.remoteAutoFetch ?? true,
    },
  };
}

function gitlab(overrides: PresetOverrides): WorkflowConfig {
  const main = overrides.main ?? "main";
  const staging = overrides.staging ?? "staging";
  const production = overrides.production ?? "production";
  return {
    version: 1,
    name: "gitlab",
    baseBranches: [
      {
        name: main,
        protected: true,
      },
      {
        name: staging,
        aliases: ["stage", "preprod"],
        base: main,
        protected: true,
      },
      {
        name: production,
        aliases: ["prod", "live"],
        base: staging,
        protected: true,
      },
    ],
    branchTypes: [
      {
        name: "feature",
        aliases: ["feat"],
        base: main,
        target: [staging],
        prefix: overrides.prefixes?.feature ?? "feature/",
      },
      {
        name: "hotfix",
        aliases: ["hot", "hfix"],
        base: production,
        target: [production, staging],
        prefix: overrides.prefixes?.hotfix ?? "hotfix/",
      },
    ],
    merge: {
      strategy: "merge",
      branchTypes: {},
      deleteOnFinish: ["feature", "hotfix"],
      squash: {
        branchTypes: ["feature"],
        enabled: true,
        default: false,
      },
    },
    remote: {
      name: overrides.remoteName ?? "origin",
      autoPush: overrides.remoteAutoPush ?? false,
      autoFetch: overrides.remoteAutoFetch ?? true,
    },
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
