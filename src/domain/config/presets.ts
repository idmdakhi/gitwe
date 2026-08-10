// src/domain/config/presets.ts

import type { WorkflowConfig } from "../entities.js";
import {
  loadPreset,
  loadProjectConfig,
  applyOverrides,
  mergeConfigs,
  getAvailablePresets as getAvailable,
  isPresetExists,
} from "./preset-loader.js";

export type PresetName = string;

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

/**
 * دریافت لیست همه presetهای موجود (از فایل‌ها)
 */
export function getAvailablePresets(projectRoot: string): string[] {
  return getAvailable(projectRoot);
}

export const PRESET_NAMES = ["classic", "github", "gitlab"] as const;

/**
 * ایجاد preset نهایی با اولویت: پروژه > بسته
 * در صورت نبود فایل در هیچکدام، خطا پرتاب می‌کند.
 */
export function createPreset(
  name: string,
  overrides: PresetOverrides = {} as PresetOverrides,
  projectRoot: string = process.cwd(),
): WorkflowConfig {
  // ۱. بارگذاری از فایل (پروژه یا بسته)
  const config = loadPreset(name, projectRoot);
  if (!config) {
    const available = getAvailablePresets(projectRoot).join(", ");
    throw new Error(
      `Preset "${name}" not found in .gitwe/preset/ or package preset/.\n` +
        `Available presets: ${available || "(none)"}`,
    );
  }

  // ۲. اعمال overrides از خط فرمان
  let result = applyOverrides(config, overrides);

  // ۳. ادغام با تنظیمات نهایی پروژه (`.gitwe/gitwe.json`)
  const projectConfig = loadProjectConfig(projectRoot);
  if (projectConfig) {
    result = mergeConfigs(result, projectConfig);
  }

  return result;
}

/**
 * بررسی وجود preset (از فایل در پروژه یا بسته)
 */
export function isPresetName(name: string, projectRoot: string = process.cwd()): boolean {
  return isPresetExists(name, projectRoot);
}
