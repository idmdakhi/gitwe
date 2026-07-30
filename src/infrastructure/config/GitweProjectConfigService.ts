import fs from "node:fs";
import path from "node:path";
import { load as yaml_load, dump as yaml_dump } from "js-yaml";

import { Workflow } from "#gitwe/domain/aggregates/Workflow";
import { WorkflowConfigLoader } from "#gitwe/infrastructure/config/WorkflowConfigLoader";
import { builtInWorkflows } from "#gitwe/infrastructure/config/BuiltInWorkflows";
import { InvalidWorkflowDefinitionError } from "#gitwe/domain/errors";
import { NoopLogger } from "#gitwe/infrastructure/logging/NoopLogger";
import type { Logger } from "#gitwe/shared/logging/Logger";

/** One entry from a `.gitwe/policies/*.yaml` file. */
export interface ReviewPolicy {
  branch: string;
  requiredReviews?: number;
  requireStatusChecks?: boolean;
  statusCheckContexts?: string[];
}

/** Everything discovered under `.gitwe/` on the last `load()`/`reload()`. */
export interface GitweProjectData {
  /** Absolute path to the main config file (`gitwe.json`/`.yaml`), or `null` if none exists. */
  readonly configPath: string | null;
  /** Parsed contents of `configPath`, or `null` if there is no main config. */
  readonly rawConfig: Record<string, unknown> | null;
  /** Absolute paths of every file under `.gitwe/workflows/`. */
  readonly workflowFiles: readonly string[];
  /** Absolute paths of every file under `.gitwe/templates/`. */
  readonly templateFiles: readonly string[];
  /** Absolute paths of every `.yaml`/`.yml` file under `.gitwe/policies/`. */
  readonly policyFiles: readonly string[];
  /** All review policies parsed out of `policyFiles`, flattened into one list. */
  readonly policies: readonly ReviewPolicy[];
}

export interface GitweProjectConfigServiceOptions {
  /** Project root to look for the config directory in. Defaults to `process.cwd()`. */
  rootDir?: string;
  /** Name of the config directory. Defaults to `".gitwe"`. */
  dirName?: string;
  logger?: Logger;
}

const CONFIG_FILE_CANDIDATES = ["gitwe.json", "gitwe.yaml", "gitwe.yml"];

/**
 * Reads and centralizes everything a project keeps under its `.gitwe/`
 * directory — the main `gitwe.json`/`.yaml` config, custom workflow
 * definitions, commit/branch templates, and review policies — and offers a
 * single place to customize it: in-memory overrides via `customize()`,
 * switching the active workflow, rendering templates with variables, and
 * persisting changes back to disk with `save()`.
 *
 * This does not replace `WorkflowConfigLoader` (which turns a single file
 * into a `Workflow` aggregate) — it wraps it, and adds everything else that
 * lives alongside the workflow file: templates and policies have no domain
 * representation of their own, so they're exposed here as plain data.
 */
export class GitweProjectConfigService {
  private readonly rootDir: string;
  private readonly gitweDir: string;
  private readonly logger: Logger;
  private readonly loader = new WorkflowConfigLoader();

  private data: GitweProjectData | null = null;
  private overrides: Record<string, unknown> = {};

  constructor(options: GitweProjectConfigServiceOptions = {}) {
    this.rootDir = options.rootDir ?? process.cwd();
    this.gitweDir = path.join(this.rootDir, options.dirName ?? ".gitwe");
    this.logger = options.logger ?? new NoopLogger();
  }

  /** Absolute path to the `.gitwe/` directory this instance reads from. */
  get directory(): string {
    return this.gitweDir;
  }

  /** Reads everything under `.gitwe/` once and caches the result. */
  load(): GitweProjectData {
    return this.data ?? this.reload();
  }

  /** Forces a fresh read of `.gitwe/` from disk, discarding the cache (but not `customize()` overrides). */
  reload(): GitweProjectData {
    const configPath = this.findConfigFile();
    const rawConfig = configPath ? this.readStructured(configPath) : null;

    const workflowFiles = this.listFiles(path.join(this.gitweDir, "workflows"));
    const templateFiles = this.listFiles(path.join(this.gitweDir, "templates"));
    const policyFiles = this.listFiles(path.join(this.gitweDir, "policies"), [".yaml", ".yml"]);
    const policies = policyFiles.flatMap((file) => this.readPolicyFile(file));

    this.data = { configPath, rawConfig, workflowFiles, templateFiles, policyFiles, policies };
    this.logger.debug("loaded .gitwe project config", {
      gitweDir: this.gitweDir,
      hasMainConfig: configPath !== null,
      workflowCount: workflowFiles.length,
      templateCount: templateFiles.length,
      policyCount: policies.length,
    });
    return this.data;
  }

  // ---------------------------------------------------------------- workflow

  /**
   * Resolves a `Workflow` by name, checked in order: a custom file in
   * `.gitwe/workflows/`, the main config (if its own `workflow` name
   * matches), then the built-ins (`git-flow`, `github-flow`, `trunk-based`).
   * With no `name`, resolves whatever `getActiveWorkflowName()` returns.
   */
  getWorkflow(name?: string): Workflow {
    const data = this.load();
    const targetName = name ?? this.getActiveWorkflowName();

    const customFile = data.workflowFiles.find(
      (file) => path.basename(file, path.extname(file)) === targetName,
    );
    if (customFile) {
      return this.loader.load(customFile);
    }

    if (data.configPath && this.rawWorkflowName(data.rawConfig) === targetName) {
      return this.loader.load(data.configPath);
    }

    if (targetName in builtInWorkflows) {
      return builtInWorkflows[targetName];
    }

    const known = this.listWorkflowNames().join(", ") || "(none found)";
    throw new InvalidWorkflowDefinitionError(
      `no workflow named "${targetName}" found in ${this.gitweDir}/workflows, the main config, ` +
        `or the built-ins. Known workflows: ${known}`,
    );
  }

  /** Names of every workflow this service can resolve: built-ins, custom files, and the main config's. */
  listWorkflowNames(): string[] {
    const data = this.load();
    const custom = data.workflowFiles.map((f) => path.basename(f, path.extname(f)));
    const main = this.rawWorkflowName(data.rawConfig);
    return [...new Set([...Object.keys(builtInWorkflows), ...custom, ...(main ? [main] : [])])];
  }

  /** The workflow name currently in effect: a `customize()` override, else the main config's, else `"git-flow"`. */
  getActiveWorkflowName(): string {
    const data = this.load();
    const overridden = this.overrides["workflow"];
    if (typeof overridden === "string") return overridden;
    return this.rawWorkflowName(data.rawConfig) ?? "git-flow";
  }

  /** Switches the active workflow (in memory — call `save()` to persist). Throws if `name` can't be resolved. */
  setActiveWorkflow(name: string): this {
    this.getWorkflow(name); // validates it actually resolves before accepting it
    return this.customize({ workflow: name });
  }

  private rawWorkflowName(raw: Record<string, unknown> | null): string | undefined {
    const value = raw?.["workflow"];
    return typeof value === "string" ? value : undefined;
  }

  // --------------------------------------------------------------- templates

  /** Renders `.gitwe/templates/<name>` by substituting `{{key}}` placeholders with `variables[key]`. */
  renderTemplate(name: string, variables: Record<string, string>): string {
    const data = this.load();
    const file = data.templateFiles.find((f) => path.basename(f) === name);
    if (!file) {
      const known = data.templateFiles.map((f) => path.basename(f)).join(", ") || "(none found)";
      throw new InvalidWorkflowDefinitionError(
        `template "${name}" not found in ${this.gitweDir}/templates. Available: ${known}`,
      );
    }
    const content = fs.readFileSync(file, "utf-8");
    return content.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) =>
      Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : match,
    );
  }

  /** Names of every file under `.gitwe/templates/`. */
  listTemplateNames(): string[] {
    return this.load().templateFiles.map((f) => path.basename(f));
  }

  // ---------------------------------------------------------------- policies

  /** All review policies parsed from `.gitwe/policies/*.yaml`. */
  getPolicies(): ReviewPolicy[] {
    return [...this.load().policies];
  }

  /** The review policy that applies to `branchName`, if any. */
  getPolicyForBranch(branchName: string): ReviewPolicy | undefined {
    return this.getPolicies().find((p) => p.branch === branchName);
  }

  // --------------------------------------------------------------- customize

  /**
   * Deep-merges `overrides` on top of the current in-memory config. Nothing
   * is written to disk until `save()` is called. Chainable.
   */
  customize(overrides: Record<string, unknown>): this {
    this.overrides = deepMerge(this.overrides, overrides);
    return this;
  }

  /** Discards every override applied via `customize()`, reverting to the on-disk config. */
  resetCustomization(): this {
    this.overrides = {};
    return this;
  }

  /** The main config file's contents deep-merged with any `customize()` overrides. */
  getEffectiveConfig(): Record<string, unknown> {
    const data = this.load();
    return deepMerge((data.rawConfig ?? {}) as Record<string, unknown>, this.overrides);
  }

  /**
   * Writes the effective config (file + overrides) back to the main config
   * file, creating `.gitwe/gitwe.json` if none existed yet. Preserves the
   * original file's format (JSON stays JSON, YAML stays YAML).
   */
  save(): void {
    const data = this.load();
    const targetPath = data.configPath ?? path.join(this.gitweDir, "gitwe.json");
    const effective = this.getEffectiveConfig();
    const ext = path.extname(targetPath).toLowerCase();
    const serialized =
      ext === ".yaml" || ext === ".yml"
        ? yaml_dump(effective)
        : JSON.stringify(effective, null, 2) + "\n";

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, serialized, "utf-8");
    this.logger.info("saved .gitwe project config", { path: targetPath });
    this.reload();
  }

  // -------------------------------------------------------------------- I/O

  private findConfigFile(): string | null {
    for (const candidate of CONFIG_FILE_CANDIDATES) {
      const full = path.join(this.gitweDir, candidate);
      if (fs.existsSync(full)) return full;
    }
    return null;
  }

  private readStructured(filePath: string): Record<string, unknown> {
    const content = fs.readFileSync(filePath, "utf-8");
    const ext = path.extname(filePath).toLowerCase();
    const parsed: unknown =
      ext === ".yaml" || ext === ".yml" ? yaml_load(content) : JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) {
      throw new InvalidWorkflowDefinitionError(`"${filePath}" must contain a JSON/YAML object`);
    }
    return parsed as Record<string, unknown>;
  }

  private listFiles(dir: string, extensions?: string[]): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => !extensions || extensions.includes(path.extname(f).toLowerCase()))
      .map((f) => path.join(dir, f))
      .filter((f) => fs.statSync(f).isFile())
      .sort();
  }

  private readPolicyFile(filePath: string): ReviewPolicy[] {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = yaml_load(content) as { policies?: ReviewPolicy[] } | undefined;
      return parsed?.policies ?? [];
    } catch (err) {
      this.logger.warn("failed to parse policy file, skipping it", {
        file: filePath,
        error: String(err),
      });
      return [];
    }
  }
}

function deepMerge<T extends Record<string, unknown>>(base: T, patch: Record<string, unknown>): T {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const existing = result[key];
    result[key] =
      isPlainObject(existing) && isPlainObject(value) ? deepMerge(existing, value) : value;
  }
  return result as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
