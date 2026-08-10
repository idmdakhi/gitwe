// src/domain/config/preset-loader.ts

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import type { WorkflowConfig } from "../entities.js";
import { parseWorkflowConfig } from "./parse.js";
import type { PresetOverrides } from "./presets.js";

const PROJECT_PRESET_DIR = ".gitwe/preset";
const SUPPORTED_EXTENSIONS = [".yaml", ".yml", ".json"];

/**
 * دریافت مسیر ریشه بسته (جایی که gitwe نصب شده است)
 */
function getPackageRoot(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // مسیر `src/domain/config/preset-loader.ts` → بالا رفتن به ریشه بسته
  return resolve(__dirname, "../../..");
}

/**
 * بارگذاری یک preset از یک دایرکتوری مشخص
 */
function loadPresetFromDirectory(name: string, dir: string): WorkflowConfig | undefined {
  if (!existsSync(dir)) return undefined;
  for (const ext of SUPPORTED_EXTENSIONS) {
    const filePath = join(dir, `${name}${ext}`);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf8");
        const parsed = ext === ".json" ? JSON.parse(content) : yaml.load(content);
        return parseWorkflowConfig(parsed);
      } catch (error) {
        throw new Error(
          `Failed to load preset "${name}" from ${filePath}: ${(error as Error).message}`,
        );
      }
    }
  }
  return undefined;
}

/**
 * بارگذاری یک preset از هر دو مکان (پروژه و بسته)
 * اولویت: پروژه > بسته
 */
export function loadPreset(name: string, projectRoot: string): WorkflowConfig | undefined {
  // ۱. ابتدا از دایرکتوری پروژه
  const projectDir = join(projectRoot, PROJECT_PRESET_DIR);
  const projectPreset = loadPresetFromDirectory(name, projectDir);
  if (projectPreset) return projectPreset;

  // ۲. سپس از دایرکتوری بسته (عمومی)
  const packageRoot = getPackageRoot();
  const globalDir = join(packageRoot, ".gitwe/preset");
  return loadPresetFromDirectory(name, globalDir);
}

/**
 * دریافت لیست همه presetهای موجود از هر دو مکان
 */
export function getAvailablePresets(projectRoot: string): string[] {
  const presetNames = new Set<string>();

  // ۱. اسکن دایرکتوری پروژه
  const projectDir = join(projectRoot, PROJECT_PRESET_DIR);
  if (existsSync(projectDir)) {
    const files = readdirSync(projectDir);
    for (const file of files) {
      const ext = file.includes(".") ? file.slice(file.lastIndexOf(".")) : "";
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        const name = file.slice(0, file.lastIndexOf("."));
        presetNames.add(name);
      }
    }
  }

  // ۲. اسکن دایرکتوری بسته
  const packageRoot = getPackageRoot();
  const globalDir = join(packageRoot, ".gitwe/preset");
  if (existsSync(globalDir)) {
    const files = readdirSync(globalDir);
    for (const file of files) {
      const ext = file.includes(".") ? file.slice(file.lastIndexOf(".")) : "";
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        const name = file.slice(0, file.lastIndexOf("."));
        presetNames.add(name);
      }
    }
  }

  return Array.from(presetNames).sort();
}

/**
 * بررسی وجود یک preset (از فایل در پروژه یا بسته)
 */
export function isPresetExists(name: string, projectRoot: string): boolean {
  return loadPreset(name, projectRoot) !== undefined;
}

/**
 * بارگذاری تنظیمات نهایی پروژه از `.gitwe/` (override نهایی)
 */
export function loadProjectConfig(projectRoot: string): WorkflowConfig | undefined {
  const configFileNames = [
    "gitwe.json",
    ".gitwe.json",
    "gitwe.yaml",
    "gitwe.yml",
    ".gitwe.yaml",
    ".gitwe.yml",
  ];
  for (const name of configFileNames) {
    const filePath = join(projectRoot, name);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf8");
        const isYaml = name.endsWith(".yaml") || name.endsWith(".yml");
        const parsed = isYaml ? yaml.load(content) : JSON.parse(content);
        return parseWorkflowConfig(parsed);
      } catch (error) {
        throw new Error(
          `Failed to load project config from "${filePath}": ${(error as Error).message}`,
        );
      }
    }
  }
  return undefined;
}

/**
 * اعمال overrides روی یک WorkflowConfig
 */
export function applyOverrides(config: WorkflowConfig, overrides: PresetOverrides): WorkflowConfig {
  const result = JSON.parse(JSON.stringify(config)) as WorkflowConfig;

  if (overrides.main) {
    const mainBranch = result.baseBranches.find((b) => b.name === "main" || b.name === "master");
    if (mainBranch) mainBranch.name = overrides.main;
  }
  if (overrides.develop) {
    const developBranch = result.baseBranches.find((b) => b.name === "develop" || b.name === "dev");
    if (developBranch) developBranch.name = overrides.develop;
  }
  if (overrides.staging) {
    const stagingBranch = result.baseBranches.find((b) => b.name === "staging");
    if (stagingBranch) stagingBranch.name = overrides.staging;
  }
  if (overrides.production) {
    const productionBranch = result.baseBranches.find((b) => b.name === "production");
    if (productionBranch) productionBranch.name = overrides.production;
  }

  if (overrides.prefixes) {
    for (const [type, prefix] of Object.entries(overrides.prefixes)) {
      const bt = result.branchTypes.find((b) => b.name === type);
      if (bt) bt.prefix = prefix;
    }
  }

  if (overrides.remoteName) {
    if (!result.remote) result.remote = { name: "origin" };
    result.remote.name = overrides.remoteName;
  }

  if (overrides.tagPrefix) {
    if (!result.versioning) {
      result.versioning = { enabled: false, tagPrefix: "v", tag: [], branchTypes: {} };
    }
    result.versioning.tagPrefix = overrides.tagPrefix;
  }

  return result;
}

/**
 * ادغام دو WorkflowConfig (تنظیمات پروژه روی preset)
 */
export function mergeConfigs(base: WorkflowConfig, override: WorkflowConfig): WorkflowConfig {
  return {
    ...base,
    ...override,
    baseBranches: override.baseBranches ?? base.baseBranches,
    branchTypes: override.branchTypes ?? base.branchTypes,
    remote: override.remote ?? base.remote,
    hooks: override.hooks ?? base.hooks,
    cli: override.cli ?? base.cli,
    merge: override.merge ?? base.merge,
    versioning: override.versioning ?? base.versioning,
  };
}
