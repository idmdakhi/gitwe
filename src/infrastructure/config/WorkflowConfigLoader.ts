import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { Workflow } from "../../domain/aggregates/Workflow";
import { BranchTypeRule } from "../../domain/valueObjects/BranchTypeRule";
import { HookDefinition } from "../../domain/hooks/HookDefinition";
import { RemoteConfig } from "../../domain/valueObjects/RemoteConfig";
import { InvalidWorkflowDefinitionError } from "../../domain/errors";
import type { WorkflowConfigReader } from "../../application/ports/WorkflowConfigReader";

interface RawBranchType {
  name: string;
  prefix: string;
  baseBranch: string;
  mergeTargets: string[];
  deleteOnFinish?: boolean;
  autoTag?: { prefix?: string; pattern?: string };
}

interface RawWorkflow {
  name: string;
  branchTypes: RawBranchType[];
  hooks?: {
    preStart?: string[];
    postStart?: string[];
    preFinish?: string[];
    postFinish?: string[];
  };
  remote?: { remote?: string; autoPush?: boolean; autoPull?: boolean };
}

/**
 * Loads a `Workflow` aggregate from a JSON or YAML file on disk. This is
 * the only config-loading code in the codebase — earlier iterations had
 * a `ConfigLoader` interface with separate JSON/YAML implementations that
 * were never actually wired into the CLI, which parsed config itself.
 */
export class WorkflowConfigLoader implements WorkflowConfigReader {
  load(filePath: string): Workflow {
    if (!fs.existsSync(filePath)) {
      throw new InvalidWorkflowDefinitionError(`config file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const ext = path.extname(filePath).toLowerCase();
    const parsed: unknown =
      ext === ".yaml" || ext === ".yml" ? yaml.load(content) : JSON.parse(content);

    if (!this.isRawWorkflow(parsed)) {
      throw new InvalidWorkflowDefinitionError("config does not match the expected workflow shape");
    }

    return this.toWorkflow(parsed);
  }

  private toWorkflow(raw: RawWorkflow): Workflow {
    return Workflow.create({
      name: raw.name,
      branchTypes: raw.branchTypes.map((rule) =>
        BranchTypeRule.create({
          name: rule.name,
          prefix: rule.prefix,
          baseBranch: rule.baseBranch,
          mergeTargets: rule.mergeTargets,
          deleteOnFinish: rule.deleteOnFinish,
          autoTag: rule.autoTag,
        }),
      ),
      hooks: raw.hooks ? HookDefinition.create(raw.hooks) : undefined,
      remote: raw.remote ? RemoteConfig.create(raw.remote) : undefined,
    });
  }

  private isRawWorkflow(value: unknown): value is RawWorkflow {
    if (typeof value !== "object" || value === null) return false;
    const obj = value as Record<string, unknown>;
    if (typeof obj["name"] !== "string") return false;
    if (!Array.isArray(obj["branchTypes"])) return false;
    return obj["branchTypes"].every((rule: unknown) => {
      if (typeof rule !== "object" || rule === null) return false;
      const r = rule as Record<string, unknown>;
      return (
        typeof r["name"] === "string" &&
        typeof r["prefix"] === "string" &&
        typeof r["baseBranch"] === "string" &&
        Array.isArray(r["mergeTargets"]) &&
        r["mergeTargets"].every((t: unknown) => typeof t === "string")
      );
    });
  }
}
