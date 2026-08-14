/**
 * Doctor use-case (RFC-0003).
 * Reports repository health and optionally performs safe repairs.
 */

import type { GitRepository } from "../interfaces/git-repository.js";
import type { OperationStateStore } from "../interfaces/operation-state.js";
import type { Workflow } from "../../domain/workflow.js";
import type { Logger } from "../interfaces/logger.js";

export type DoctorSeverity = "ok" | "warning" | "error";

export interface DoctorFinding {
  id: string;
  severity: DoctorSeverity;
  message: string;
  /** Human-readable suggestion (always present for non-ok findings) */
  suggestion?: string;
  /** Whether --fix can safely address this finding */
  fixable: boolean;
  /** True when a fix was applied during this run */
  fixed?: boolean;
}

export interface DoctorReport {
  ok: boolean;
  findings: DoctorFinding[];
  fixedCount: number;
}

export interface DoctorOptions {
  /** Attempt safe repairs */
  fix?: boolean;
  /** Non-interactive (assume yes for confirmations) */
  yes?: boolean;
}

export class DoctorUseCase {
  constructor(
    private readonly git: GitRepository,
    private readonly workflow: Workflow,
    private readonly stateStore: OperationStateStore,
    private readonly logger: Logger,
  ) {}

  async run(options: DoctorOptions = {}): Promise<DoctorReport> {
    const findings: DoctorFinding[] = [];
    let fixedCount = 0;

    // 1. Missing base branches
    for (const base of this.workflow.config.baseBranches) {
      const exists = await this.git.branchExists(base.name);
      if (!exists) {
        const finding: DoctorFinding = {
          id: "missing-base",
          severity: "error",
          message: `base branch "${base.name}" is missing`,
          suggestion: `Create it from its parent (or HEAD if root) with \`gitwe doctor --fix\``,
          fixable: true,
        };

        if (options.fix) {
          try {
            const startPoint =
              base.base && (await this.git.branchExists(base.base)) ? base.base : "HEAD";
            await this.git.createBranch(base.name, startPoint);
            finding.fixed = true;
            finding.message = `base branch "${base.name}" was missing and has been created from ${startPoint}`;
            fixedCount++;
            this.logger.info(`created missing base branch ${base.name}`);
          } catch (err) {
            finding.suggestion = `Failed to create: ${err instanceof Error ? err.message : String(err)}`;
            finding.fixable = false;
          }
        }
        findings.push(finding);
      }
    }

    // 2. Stale operation state
    if (this.stateStore.exists()) {
      const finding: DoctorFinding = {
        id: "stale-operation",
        severity: "warning",
        message:
          "a previous operation appears to be interrupted (.git/gitwe/operation.json exists)",
        suggestion:
          "Run `gitwe finish --continue` if you want to resume, or `gitwe finish --abort` / `gitwe doctor --fix` to clear the state",
        fixable: true,
      };

      if (options.fix) {
        // Safe: only delete the state file; never auto-resume
        if (options.yes || true) {
          // In non-interactive mode we clear; interactive would ask (CLI layer)
          await this.stateStore.clear();
          finding.fixed = true;
          finding.message = "stale operation state has been cleared";
          fixedCount++;
          this.logger.info("cleared stale operation state");
        }
      }
      findings.push(finding);
    }

    // 3. Dirty working tree (report only – never auto-stash)
    const clean = await this.git.isClean();
    if (!clean) {
      findings.push({
        id: "dirty-worktree",
        severity: "warning",
        message: "working tree has uncommitted changes",
        suggestion: "Commit or stash your changes before running workflow commands",
        fixable: false,
      });
    }

    // 4. Detached HEAD
    try {
      const current = await this.git.currentBranch();
      // Some GitRepository implementations return "HEAD" or throw when detached
      if (current === "HEAD" || current === "") {
        findings.push({
          id: "detached-head",
          severity: "warning",
          message: "HEAD is detached",
          suggestion: "Checkout a branch before running most gitwe commands",
          fixable: false,
        });
      }
    } catch {
      findings.push({
        id: "detached-head",
        severity: "warning",
        message: "HEAD is detached or current branch cannot be determined",
        suggestion: "Checkout a branch before running most gitwe commands",
        fixable: false,
      });
    }

    // 5. Unknown parent references (config integrity – already validated on load, but double-check)
    for (const base of this.workflow.config.baseBranches) {
      if (base.base && !this.workflow.config.baseBranches.some((b) => b.name === base.base)) {
        findings.push({
          id: "unknown-parent",
          severity: "error",
          message: `base branch "${base.name}" references unknown parent "${base.base}"`,
          suggestion: "Edit the workflow definition and fix the parent reference",
          fixable: false,
        });
      }
    }

    // If nothing wrong
    if (findings.length === 0) {
      findings.push({
        id: "healthy",
        severity: "ok",
        message: "workflow is healthy",
        fixable: false,
      });
    }

    const ok = findings.every((f) => f.severity === "ok" || f.fixed === true);

    return { ok, findings, fixedCount };
  }
}
