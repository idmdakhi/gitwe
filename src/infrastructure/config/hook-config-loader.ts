import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import type { HookConfig } from "../../domain/entities/hook-config.entity.js";
import type { WorkflowConfig } from "../../domain/entities/workflow-config.entity.js";

export interface HookConfigLoaderOptions {
  root: string;
  mainConfig: WorkflowConfig;
  explicitFile?: string;
}

export class HookConfigLoader {
  async load(options: HookConfigLoaderOptions): Promise<HookConfig> {
    const { root, mainConfig, explicitFile } = options;
    const mainHooks = mainConfig.hooks ?? {
      enabled: true,
      config: ".gitwe/hooks.yaml",
      path: ".gitwe/hooks",
    };

    let filePath = explicitFile ?? mainHooks.config ?? ".gitwe/hook.yaml";
    filePath = join(root, filePath);
    const scriptsPath = mainHooks.path ?? ".gitwe/hooks";

    let fileConfig: Partial<HookConfig> = {};
    if (existsSync(filePath)) {
      const raw = await readFile(filePath, "utf8");
      fileConfig = yaml.load(raw) as Partial<HookConfig>;
    }

    const merged: HookConfig = {
      enabled: mainHooks.enabled ?? fileConfig.enabled ?? true,
      path: mainHooks.path ?? fileConfig.path ?? ".gitwe/hooks.yaml",
      config: mainHooks.config ?? scriptsPath ?? ".gitwe/hooks",
      inline: { ...fileConfig.inline, ...mainHooks.inline },
      advanced: { ...fileConfig.advanced, ...mainHooks.advanced },
      typeOverrides: { ...fileConfig.typeOverrides, ...mainHooks.typeOverrides },
    };

    return merged;
  }
}
