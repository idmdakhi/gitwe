import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, isAbsolute, join, resolve } from "node:path";
import yaml from "js-yaml";

import { ConfigError, NotInitializedError } from "../../domain/errors.js";
import type { WorkflowConfig } from "../../domain/entities.js";
import { parseWorkflowConfig } from "../../domain/config/parse.js";

/** File names gitwe looks for, in order, when walking up from the cwd. */
export const CONFIG_FILE_NAMES = [
  "gitwe.json",
  ".gitwe.json",
  "gitwe.yaml",
  "gitwe.yml",
  ".gitwe.yaml",
  ".gitwe.yml",
];

export const DEFAULT_CONFIG_FILE = "gitwe.json";

export interface LoadedConfig {
  config: WorkflowConfig;
  /** Absolute path of the file the definition was read from. */
  path: string;
}

export function findConfigFile(startDir: string, stopDir?: string): string | undefined {
  let dir = resolve(startDir);
  const stop = stopDir === undefined ? undefined : resolve(stopDir);
  for (;;) {
    for (const name of CONFIG_FILE_NAMES) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
    if (stop !== undefined && dir === stop) return undefined;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

export function readConfigFile(path: string): WorkflowConfig {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    throw new ConfigError(
      `cannot read workflow definition at ${path}: ${(error as Error).message}`,
    );
  }
  const isYaml = [".yaml", ".yml"].includes(extname(path).toLowerCase());
  let parsed: unknown;
  try {
    parsed = isYaml ? yaml.load(raw) : JSON.parse(raw);
  } catch (error) {
    throw new ConfigError(
      `${path} is not valid ${isYaml ? "YAML" : "JSON"}: ${(error as Error).message}`,
    );
  }
  return parseWorkflowConfig(parsed);
}

export function writeConfigFile(path: string, config: WorkflowConfig): void {
  const isYaml = [".yaml", ".yml"].includes(extname(path).toLowerCase());
  const content = isYaml
    ? yaml.dump(config, { lineWidth: 100, noRefs: true })
    : `${JSON.stringify(config, null, 2)}\n`;
  writeFileSync(path, content, "utf8");
}

export interface LoadOptions {
  cwd: string;
  /** Explicit definition path, e.g. from `--config`. */
  configPath?: string;
  /** Repository root; the search never walks above it. */
  root?: string;
}

export function loadConfig({ cwd, configPath, root }: LoadOptions): LoadedConfig {
  const normalizedCwd = resolve(cwd);
  const normalizedRoot = root ? resolve(root) : undefined;
  if (configPath !== undefined) {
    const path = isAbsolute(configPath) ? configPath : resolve(normalizedCwd, configPath);
    if (!existsSync(path)) {
      throw new ConfigError(`workflow definition not found: ${path}`);
    }
    return { config: readConfigFile(path), path };
  }
  const found = findConfigFile(normalizedCwd, normalizedRoot);
  if (found === undefined) throw new NotInitializedError(cwd);
  return { config: readConfigFile(found), path: found };
}
