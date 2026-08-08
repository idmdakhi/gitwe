// src/domain/config/presets.ts

import type { WorkflowConfig } from "../entities.js";
import { loadPresetFromFile, applyOverrides } from "./preset-loader.js";

export type PresetName = string; // دیگر محدود به سه مقدار نیست

export interface PresetOverrides {
  main?: string;
  develop?: string;
  production?: string;
  staging?: string;
  remoteName?: string;
  remoteAutoPush?: boolean;
  remoteAutoFetch?: boolean;
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
  prefixes?: Record<string, string>;
  bases?: Record<string, string>;
  targets?: Record<string, string>;
  changelogEnabled?: boolean;
  versioningEnabled?: boolean;
}

// ====== Presetهای توکار (برای fallback) ======

function builtinClassic(): WorkflowConfig {
  return {
    version: 1,
    name: "classic",
    remote: { name: "origin", autoPush: false, autoFetch: true },
    hooks: { enabled: true, path: ".gitwe/hooks" },
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
        name: "bugfix",
        aliases: ["fix", "bug"],
        base: "develop",
        target: ["develop"],
        prefix: "bugfix/",
      },
      {
        name: "release",
        aliases: ["rls", "rels"],
        base: "develop",
        target: ["main", "develop"],
        prefix: "release/",
      },
      {
        name: "hotfix",
        aliases: ["hot", "hfix", "patch"],
        base: "main",
        target: ["main", "develop"],
        prefix: "hotfix/",
      },
      { name: "support", aliases: ["lts"], base: "main", target: ["main"], prefix: "support/" },
    ],
    merge: {
      strategy: "merge",
      branchTypes: {},
      deleteOnFinish: ["feature", "release", "hotfix"],
      squash: { branchTypes: ["feature"], enabled: true, default: false },
    },
    versioning: {
      enabled: false,
      tagPrefix: "v",
      format: "{{tagPrefix}}{{major}}.{{minor}}.{{patch}}",
      tag: ["main"],
      bumpRules: { major: [], minor: ["feature", "release"], patch: ["hotfix", "bugfix"] },
      branchTypes: {},
      annotated: true,
      pushTags: false,
      autoCommit: true,
      path: ".gitwe/VERSION.yaml",
      commitMessage: "chore: bump version to {{version}}",
      initialVersion: "0.1.0",
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
  };
}

function builtinGithub(): WorkflowConfig {
  return {
    version: 1,
    name: "github",
    remote: { name: "origin", autoPush: false, autoFetch: true },
    hooks: { enabled: true, path: ".gitwe/hooks" },
    baseBranches: [{ name: "main", aliases: ["master"], protected: true }],
    branchTypes: [
      { name: "feature", aliases: ["feat"], base: "main", target: ["main"], prefix: "feature/" },
      {
        name: "bugfix",
        aliases: ["fix", "bug"],
        base: "main",
        target: ["main"],
        prefix: "bugfix/",
      },
    ],
    merge: {
      strategy: "merge",
      branchTypes: {},
      deleteOnFinish: ["feature", "bugfix"],
      squash: { branchTypes: ["feature"], enabled: true, default: false },
    },
    versioning: {
      enabled: false,
      tagPrefix: "v",
      format: "{{tagPrefix}}{{major}}.{{minor}}.{{patch}}",
      tag: ["main"],
      bumpRules: { major: [], minor: ["feature"], patch: ["bugfix"] },
      branchTypes: {},
      annotated: true,
      pushTags: false,
      autoCommit: true,
      path: ".gitwe/VERSION.yaml",
      commitMessage: "chore: bump version to {{version}}",
      initialVersion: "0.1.0",
    },
    cli: { enabled: true, interactive: true, color: true, aliases: {} },
  };
}

function builtinGitlab(): WorkflowConfig {
  return {
    version: 1,
    name: "gitlab",
    remote: { name: "origin", autoPush: false, autoFetch: true },
    hooks: { enabled: true, path: ".gitwe/hooks" },
    baseBranches: [
      { name: "main", protected: true },
      { name: "staging", aliases: ["stage", "preprod"], base: "main", protected: true },
      { name: "production", aliases: ["prod", "live"], base: "staging", protected: true },
    ],
    branchTypes: [
      { name: "feature", aliases: ["feat"], base: "main", target: ["staging"], prefix: "feature/" },
      {
        name: "hotfix",
        aliases: ["hot", "hfix"],
        base: "production",
        target: ["production", "staging"],
        prefix: "hotfix/",
      },
    ],
    merge: {
      strategy: "merge",
      branchTypes: {},
      deleteOnFinish: ["feature", "hotfix"],
      squash: { branchTypes: ["feature"], enabled: true, default: false },
    },
    versioning: {
      enabled: false,
      tagPrefix: "v",
      format: "{{tagPrefix}}{{major}}.{{minor}}.{{patch}}",
      tag: ["main"],
      bumpRules: { major: [], minor: ["feature"], patch: ["hotfix"] },
      branchTypes: {},
      annotated: true,
      pushTags: false,
      autoCommit: true,
      path: ".gitwe/VERSION.yaml",
      commitMessage: "chore: bump version to {{version}}",
      initialVersion: "0.1.0",
    },
    cli: { enabled: true, interactive: true, color: true, aliases: {} },
  };
}

const builtinPresets: Record<string, () => WorkflowConfig> = {
  classic: builtinClassic,
  github: builtinGithub,
  gitlab: builtinGitlab,
};

/**
 * ایجاد preset با قابلیت بارگذاری از فایل و اعمال overrides
 */
export function createPreset(
  name: string,
  overrides: PresetOverrides = {} as PresetOverrides,
  root: string = process.cwd(),
): WorkflowConfig {
  // ۱. تلاش برای بارگذاری از فایل
  const fileConfig = loadPresetFromFile(name, root);
  if (fileConfig) {
    return applyOverrides(fileConfig, overrides);
  }

  // ۲. fallback به presetهای توکار
  const builder = builtinPresets[name];
  if (!builder) {
    throw new Error(
      `Unknown preset "${name}". Available presets: ${Object.keys(builtinPresets).join(", ")}`,
    );
  }

  const config = builder();
  return applyOverrides(config, overrides);
}

/**
 * بررسی وجود preset (از فایل یا توکار)
 */
export function isPresetName(name: string, root: string = process.cwd()): boolean {
  if (builtinPresets[name]) return true;
  return loadPresetFromFile(name, root) !== undefined;
}

export { getAvailablePresets } from "./preset-loader.js";
