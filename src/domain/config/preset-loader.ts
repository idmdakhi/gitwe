// src/domain/config/preset-loader.ts

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import type { WorkflowConfig } from "../entities.js";
import { parseWorkflowConfig } from "./parse.js";
import type { PresetOverrides } from "./presets.js";

const PRESET_DIR = ".gitwe/preset";
const SUPPORTED_EXTENSIONS = [".yaml", ".yml", ".json"];

/**
 * بارگذاری یک preset از فایل داخل `.gitwe/preset/`
 */
export function loadPresetFromFile(name: string, root: string): WorkflowConfig | undefined {
  const presetDir = join(root, PRESET_DIR);
  if (!existsSync(presetDir)) return undefined;

  for (const ext of SUPPORTED_EXTENSIONS) {
    const filePath = join(presetDir, `${name}${ext}`);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf8");
        const parsed = ext === ".json" ? JSON.parse(content) : yaml.load(content);
        return parseWorkflowConfig(parsed);
      } catch (error) {
        throw new Error(`Failed to load preset "${name}": ${(error as Error).message}`);
      }
    }
  }
  return undefined;
}

/**
 * دریافت لیست همه presetهای موجود (هم توکار و هم فایل‌ها)
 */
export function getAvailablePresets(root: string): string[] {
  const builtinPresets: string[] = ["classic", "github", "gitlab"];
  const filePresets: string[] = [];

  const presetDir = join(root, PRESET_DIR);
  if (existsSync(presetDir)) {
    const files = readdirSync(presetDir);
    for (const file of files) {
      const ext = file.includes(".") ? file.slice(file.lastIndexOf(".")) : "";
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        const name = file.slice(0, file.lastIndexOf("."));
        if (!filePresets.includes(name)) {
          filePresets.push(name);
        }
      }
    }
  }

  // ترکیب presetهای توکار و فایل‌ها (فایل‌ها اولویت دارند)
  const all = [...filePresets];
  for (const preset of builtinPresets) {
    if (!all.includes(preset)) {
      all.push(preset);
    }
  }
  return all;
}

/**
 * اعمال overrides روی یک WorkflowConfig
 */
export function applyOverrides(config: WorkflowConfig, overrides: PresetOverrides): WorkflowConfig {
  const result = JSON.parse(JSON.stringify(config)) as WorkflowConfig;

  // اعمال نام‌های شاخه‌ها
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

  // اعمال پیشوندها
  if (overrides.prefixes) {
    for (const [type, prefix] of Object.entries(overrides.prefixes)) {
      const bt = result.branchTypes.find((b) => b.name === type);
      if (bt) bt.prefix = prefix;
    }
  }

  // اعمال remote
  if (overrides.remoteName) {
    if (!result.remote) result.remote = { name: "origin" };
    result.remote.name = overrides.remoteName;
  }

  // اعمال tagPrefix
  if (overrides.tagPrefix) {
    if (!result.versioning) {
      result.versioning = { enabled: false, tagPrefix: "v", tag: [], branchTypes: {} };
    }
    result.versioning.tagPrefix = overrides.tagPrefix;
  }

  return result;
}
