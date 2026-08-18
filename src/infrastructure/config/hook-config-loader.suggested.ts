import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import type { HookConfig } from "../../domain/entities/hook-config.entity.js";
import type { WorkflowConfig } from "../../domain/entities/workflow-config.entity.js";

export interface HookConfigLoaderOptions {
  root: string;
  mainConfig: WorkflowConfig;
  /** Explicit path to the hooks YAML file (not the scripts directory). */
  explicitFile?: string;
}

/**
 * Suggested loader that separates:
 * - configFile  → YAML with inline/advanced/typeOverrides
 * - path        → directory of executable scripts (.gitwe/hooks)
 *
 * Workflow YAML can use either:
 *   hooks:
 *     enabled: true
 *     path: .gitwe/hooks          # scripts dir
 *     config: .gitwe/hook.yaml    # optional; if absent, try defaults
 * or the legacy single `path` that sometimes pointed at a yaml file.
 */
export class HookConfigLoader {
  private static readonly CONFIG_CANDIDATES = [
    ".gitwe/hook.yaml",
    ".gitwe/hooks.yaml",
    ".gitwe/hook.yml",
    ".gitwe/hooks.yml",
  ];

  async load(options: HookConfigLoaderOptions): Promise<HookConfig> {
    const { root, mainConfig, explicitFile } = options;
    const mainHooks = mainConfig.hooks ?? {
      enabled: true,
      path: ".gitwe/hooks",
      config: ".gitwe/hooks.yaml",
    };

    const configFile = this.resolveConfigFile(root, mainHooks, explicitFile);
    let fileConfig: Partial<HookConfig> & { config?: string } = {};

    if (configFile && existsSync(configFile)) {
      const raw = await readFile(configFile, "utf8");
      fileConfig = (yaml.load(raw) as Partial<HookConfig>) ?? {};
    }

    const scriptsPath = this.resolveScriptsPath(mainHooks, fileConfig);

    return {
      enabled: mainHooks.enabled ?? fileConfig.enabled ?? true,
      path: scriptsPath,
      inline: { ...fileConfig.inline, ...mainHooks.inline },
      advanced: { ...fileConfig.advanced, ...mainHooks.advanced },
      typeOverrides: { ...fileConfig.typeOverrides, ...mainHooks.typeOverrides },
    } as HookConfig;
  }

  private resolveConfigFile(
    root: string,
    mainHooks: NonNullable<WorkflowConfig["hooks"]>,
    explicitFile?: string,
  ): string | undefined {
    if (explicitFile) return join(root, explicitFile);

    // Optional future field on workflow config: hooks.config
    const fromMain = (mainHooks as { config?: string }).config;
    if (fromMain) return join(root, fromMain);

    // Legacy: path pointed at a yaml file
    if (mainHooks.path && /\.ya?ml$/i.test(mainHooks.path) && !mainHooks.path.includes("|")) {
      return join(root, mainHooks.path);
    }

    for (const candidate of HookConfigLoader.CONFIG_CANDIDATES) {
      const abs = join(root, candidate);
      if (existsSync(abs)) return abs;
    }
    return undefined;
  }

  private resolveScriptsPath(
    mainHooks: NonNullable<WorkflowConfig["hooks"]>,
    fileConfig: Partial<HookConfig>,
  ): string {
    const candidates = [fileConfig.path, mainHooks.path, ".gitwe/hooks"];
    for (const c of candidates) {
      if (!c) continue;
      if (c.includes("|")) continue;
      if (/\.ya?ml$/i.test(c)) continue;
      return c;
    }
    return ".gitwe/hooks";
  }
}
