import { readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import * as YAML from "yaml";
import type { WorkflowConfigStore } from "#gitwe/application/ports/workflow-config-store";
import { Workflow } from "#gitwe/domain/aggregates/workflow";
import { InvalidWorkflowDefinitionError } from "#gitwe/domain/errors/index";
import { WorkflowSerializer, type WorkflowConfigFile } from "#gitwe/infrastructure/config/workflow-serializer";

const CANDIDATE_FILENAMES = ["gitwe.json", "gitwe.yaml", "gitwe.yml"];

/**
 * Default {@link WorkflowConfigStore} implementation: reads and writes a
 * `gitwe.json` (or `.yaml`/`.yml`) file at the repository root.
 *
 * On {@link FileWorkflowConfigStore.save}, the format written matches
 * whichever file already exists; if none exists yet, JSON is used.
 *
 * @public
 */
export class FileWorkflowConfigStore implements WorkflowConfigStore {
  /** @param cwd - Directory to look for a config file in. Defaults to `process.cwd()`. */
  constructor(private readonly cwd: string = process.cwd()) {}

  async exists(): Promise<boolean> {
    return (await this.findConfigPath()) !== undefined;
  }

  async load(): Promise<Workflow> {
    const path = await this.findConfigPath();
    if (!path) {
      throw new InvalidWorkflowDefinitionError(
        `no workflow configuration found (looked for ${CANDIDATE_FILENAMES.join(", ")} in ${this.cwd}). Run "gitwe init" first.`,
      );
    }

    const raw = await readFile(path, "utf-8");
    const parsed: WorkflowConfigFile = path.endsWith(".json") ? JSON.parse(raw) : YAML.parse(raw);
    return WorkflowSerializer.fromPlain(parsed);
  }

  async save(workflow: Workflow): Promise<void> {
    const existingPath = await this.findConfigPath();
    const path = existingPath ?? join(this.cwd, "gitwe.json");
    const plain = WorkflowSerializer.toPlain(workflow);
    const content = path.endsWith(".json")
      ? JSON.stringify(plain, null, 2) + "\n"
      : YAML.stringify(plain);
    await writeFile(path, content, "utf-8");
  }

  private async findConfigPath(): Promise<string | undefined> {
    for (const filename of CANDIDATE_FILENAMES) {
      const path = join(this.cwd, filename);
      try {
        await access(path);
        return path;
      } catch {
        continue;
      }
    }
    return undefined;
  }
}
