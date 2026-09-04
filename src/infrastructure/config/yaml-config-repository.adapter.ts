import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import yaml from "js-yaml";
import type { WorkflowConfig } from "../../domain/entities/workflow-config.entity.js";
import type { ConfigRepository } from "../../domain/ports/config-repository.port.js";
import { ConfigError } from "../../domain/errors/index.js";

const CANDIDATE_NAMES = [
  "gitwe.json",
  ".gitwe.json",
  "gitwe.yaml",
  "gitwe.yml",
  ".gitwe.yaml",
  ".gitwe.yml",
  ".gitwe/gitwe.yaml",
  ".gitwe/gitwe.yml",
  ".gitwe/gitwe.json",
];

/** Loads/saves the workflow definition as JSON or YAML from disk. */
export class YamlConfigRepository implements ConfigRepository {
  readonly path: string;

  constructor(root: string, explicitPath?: string) {
    this.path = explicitPath
      ? join(root, explicitPath)
      : CANDIDATE_NAMES.map((name) => join(root, name)).find(existsSync) ??
        join(root, ".gitwe/gitwe.yaml");
  }

  async load(): Promise<WorkflowConfig | undefined> {
    if (!existsSync(this.path)) return undefined;
    const raw = await readFile(this.path, "utf8");
    try {
      const parsed = this.path.endsWith(".json") ? JSON.parse(raw) : yaml.load(raw);
      return parsed as WorkflowConfig;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ConfigError(`failed to parse ${this.path}: ${message}`);
    }
  }

  async save(config: WorkflowConfig): Promise<void> {
    const serialized = this.path.endsWith(".json")
      ? JSON.stringify(config, null, 2)
      : yaml.dump(config, { lineWidth: 100 });
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, serialized, "utf8");
  }
}
