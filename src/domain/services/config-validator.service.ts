import type { WorkflowConfig } from "../entities/workflow-config.entity.js";
import { ValidationError } from "../errors/index.js";

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export class ConfigValidationResult {
  constructor(readonly issues: readonly ValidationIssue[]) {}

  get valid(): boolean {
    return this.issues.length === 0;
  }

  /** Throws a {@link ValidationError} summarising every issue, if any. */
  assertValid(): void {
    if (this.valid) return;
    const summary = this.issues.map((i) => `  - ${i.path}: ${i.message}`).join("\n");
    throw new ValidationError(`workflow definition is invalid:\n${summary}`);
  }
}

/**
 * Structural validation of a {@link WorkflowConfig}, independent of git
 * or the filesystem. Every rule here is something the *definition*
 * can get wrong, so it is checked before any branch operation runs —
 * including `gitwe config edit`.
 */
export class ConfigValidatorService {
  validate(config: WorkflowConfig): ConfigValidationResult {
    const issues: ValidationIssue[] = [];
    if (config.versioning?.tagTargets) {
      for (const target of config.versioning.tagTargets) {
        if (!config.baseBranches.some((b) => b.name === target)) {
          issues.push({
            path: "versioning.tagTargets",
            message: `target branch "${target}" not found in baseBranches`,
          });
        }
      }
    }
    this.checkBaseBranches(config, issues);
    this.checkBranchTypes(config, issues);
    this.checkMergeConfig(config, issues);

    return new ConfigValidationResult(issues);
  }

  private checkBaseBranches(config: WorkflowConfig, issues: ValidationIssue[]): void {
    const { baseBranches } = config;

    if (baseBranches.length === 0) {
      issues.push({ path: "baseBranches", message: "at least one base branch is required" });
      return;
    }

    const roots = baseBranches.filter((b) => b.base === undefined);
    if (roots.length !== 1) {
      issues.push({
        path: "baseBranches",
        message: `exactly one root base branch (without "base") is required, found ${roots.length}`,
      });
    }

    const names = new Set<string>();
    for (const b of baseBranches) {
      const key = b.name.toLowerCase();
      if (names.has(key)) {
        issues.push({ path: `baseBranches.${b.name}`, message: "duplicate base branch name" });
      }
      names.add(key);
    }

    for (const b of baseBranches) {
      if (b.base !== undefined && !baseBranches.some((other) => other.name === b.base)) {
        issues.push({
          path: `baseBranches.${b.name}.base`,
          message: `references unknown base branch "${b.base}"`,
        });
      }
    }

    // Detect cycles in the base-branch tree.
    for (const start of baseBranches) {
      const seen = new Set<string>([start.name]);
      let cursor: string | undefined = start.base;
      while (cursor !== undefined) {
        if (seen.has(cursor)) {
          issues.push({
            path: `baseBranches.${start.name}`,
            message: "base branch tree contains a cycle",
          });
          break;
        }
        seen.add(cursor);
        cursor = baseBranches.find((b) => b.name === cursor)?.base;
      }
    }
  }

  private checkBranchTypes(config: WorkflowConfig, issues: ValidationIssue[]): void {
    const { baseBranches, branchTypes } = config;

    if (branchTypes.length === 0) {
      issues.push({ path: "branchTypes", message: "at least one branch type is required" });
    }

    const names = new Set<string>();
    const prefixes = new Set<string>();

    for (const t of branchTypes) {
      const key = t.name.toLowerCase();
      if (names.has(key)) {
        issues.push({ path: `branchTypes.${t.name}`, message: "duplicate branch type name" });
      }
      names.add(key);

      if (prefixes.has(t.prefix)) {
        issues.push({
          path: `branchTypes.${t.name}.prefix`,
          message: `prefix "${t.prefix}" is already used by another branch type`,
        });
      }
      prefixes.add(t.prefix);

      if (!t.prefix.endsWith("/")) {
        issues.push({ path: `branchTypes.${t.name}.prefix`, message: 'prefix must end with "/"' });
      }

      if (!baseBranches.some((b) => b.name === t.base)) {
        issues.push({
          path: `branchTypes.${t.name}.base`,
          message: `references unknown base branch "${t.base}"`,
        });
      }

      if (t.target.length === 0) {
        issues.push({
          path: `branchTypes.${t.name}.target`,
          message: "at least one target is required",
        });
      }
      for (const target of t.target) {
        if (!baseBranches.some((b) => b.name === target)) {
          issues.push({
            path: `branchTypes.${t.name}.target`,
            message: `references unknown base branch "${target}"`,
          });
        }
      }
    }
  }

  private checkMergeConfig(config: WorkflowConfig, issues: ValidationIssue[]): void {
    const merge = config.merge;
    if (!merge) return;

    const knownTypes = new Set(config.branchTypes.map((t) => t.name));
    for (const name of merge.deleteOnFinish ?? []) {
      if (!knownTypes.has(name)) {
        issues.push({ path: "merge.deleteOnFinish", message: `unknown branch type "${name}"` });
      }
    }
    for (const name of Object.keys(merge.branchTypes ?? {})) {
      if (!knownTypes.has(name)) {
        issues.push({ path: "merge.branchTypes", message: `unknown branch type "${name}"` });
      }
    }
  }
}
