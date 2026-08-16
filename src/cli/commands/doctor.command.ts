import { Command } from "commander";
import { loadEngine, action } from "./shared.js";
import { style } from "../output.js";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Doctor command: checks repository health against the workflow definition.
 * With --fix, it safely repairs a subset of problems:
 *   - missing base branches (create them)
 *   - stale operation state file (remove it)
 */
export function doctorCommand(): Command {
  return new Command("doctor")
    .description("check repository health against the workflow definition")
    .option("--fix", "Attempt to safely repair problems", false)
    .option("--yes", "Non-interactive; assume yes for confirmations", false)
    .action(
      action(async function (this: Command, out) {
        const engine = await loadEngine(this);
        const opts = this.opts<{ fix: boolean; yes: boolean }>();
        const cwd = engine["deps"].git.cwd; // access the repo root

        const overview = await engine.overview();
        const validation = engine.validate();

        const findings: Array<{
          severity: "ok" | "warning" | "error";
          id: string;
          message: string;
          fixable: boolean;
        }> = [];

        // ---- config validation ---------------------------------------------
        if (!validation.valid) {
          for (const issue of validation.issues) {
            findings.push({
              severity: "error",
              id: "config-invalid",
              message: `${issue.path}: ${issue.message}`,
              fixable: false,
            });
          }
        }

        // ---- detached HEAD -------------------------------------------------
        if (!overview.currentBranch) {
          findings.push({
            severity: "warning",
            id: "detached-head",
            message: "HEAD is detached",
            fixable: false,
          });
        }

        // ---- no base branches ----------------------------------------------
        if (overview.baseBranches.length === 0) {
          findings.push({
            severity: "error",
            id: "no-base",
            message: "no base branches in the workflow definition",
            fixable: false,
          });
        }

        // ---- missing base branches (in git) --------------------------------
        const git = engine["deps"].git;
        const missingBaseBranches: string[] = [];
        for (const baseName of overview.baseBranches) {
          if (!(await git.branchExists(baseName))) {
            missingBaseBranches.push(baseName);
            findings.push({
              severity: "error",
              id: "missing-base",
              message: `base branch "${baseName}" does not exist locally`,
              fixable: true,
            });
          }
        }

        // ---- stale operation state -----------------------------------------
        const stateStore = engine["deps"].stateStore;
        const stateExists = await stateStore.exists();
        if (stateExists) {
          const state = await stateStore.read();
          findings.push({
            severity: "warning",
            id: "stale-operation",
            message: `stale operation state found (${state?.operation} @ ${state?.currentStep})`,
            fixable: true,
          });
        }

        // ---- missing upstream for topic branches ---------------------------
        const allBranches = await git.listBranches();
        for (const branch of allBranches) {
          const resolved = engine.workflow.resolveBranch(branch);
          if (resolved) {
            const upstream = await git.upstreamOf(branch);
            if (!upstream) {
              findings.push({
                severity: "warning",
                id: "missing-upstream",
                message: `topic branch "${branch}" has no upstream set`,
                fixable: true,
              });
              // We'll only report one per branch; limit to avoid spam
              break;
            }
          }
        }

        // ---- dirty worktree ------------------------------------------------
        const isClean = await git.isClean();
        if (!isClean) {
          findings.push({
            severity: "warning",
            id: "dirty-worktree",
            message: "working tree has uncommitted changes (blocks operations)",
            fixable: false,
          });
        }

        // ---- if no findings, report healthy --------------------------------
        if (findings.length === 0) {
          findings.push({
            severity: "ok",
            id: "healthy",
            message: "workflow looks healthy",
            fixable: false,
          });
        }

        // ---- Fix logic -----------------------------------------------------
        let fixed: string[] = [];
        if (opts.fix) {
          const fixable = findings.filter((f) => f.fixable && f.severity !== "ok");
          const requireConfirm = !opts.yes && fixable.length > 0;

          if (requireConfirm) {
            // In a real interactive terminal, we'd prompt; but we don't have a prompt here.
            // We'll just print a warning and skip fixing.
            // (We could import confirm from prompts if needed, but we want to keep it simple.)
            out.warn("Some problems are fixable, but --yes was not given. Use --yes to auto-fix.");
          }

          // Fix missing base branches
          for (const baseName of missingBaseBranches) {
            if (opts.yes || !requireConfirm) {
              // Find the base branch config to get its parent
              const baseConfig = engine.config.baseBranches.find((b) => b.name === baseName);
              const startPoint = baseConfig?.base ?? "HEAD";
              await git.createBranch(baseName, startPoint);
              fixed.push(`created base branch "${baseName}" from ${startPoint}`);
            }
          }

          // Fix stale operation state
          if (stateExists && (opts.yes || !requireConfirm)) {
            await stateStore.clear();
            fixed.push(`removed stale operation state`);
          }

          // For missing upstream, we could set-upstream, but that's more involved.
          // We'll skip for now as it's not always safe (might need remote branch).
          // For now, we only fix base branches and stale state.
        }

        // ---- Build report --------------------------------------------------
        const ok = findings.every((f) => f.severity !== "error");
        const report = {
          ok,
          workflow: overview.workflowName,
          currentBranch: overview.currentBranch ?? null,
          findings,
          fixed: fixed.length > 0 ? fixed : undefined,
        };

        const details = findings.map((f) => {
          const icon =
            f.severity === "ok"
              ? style.green("✓")
              : f.severity === "warning"
                ? style.yellow("!")
                : style.red("✗");
          const fixMark = f.fixable ? " (fixable)" : "";
          return `  ${icon} ${f.message}${fixMark}`;
        });

        if (fixed.length > 0) {
          details.push("");
          details.push(style.green("✓ Fixed:"));
          for (const f of fixed) {
            details.push(`  ${style.green("✔")} ${f}`);
          }
        }

        out.ok({
          data: report,
          details,
        });

        process.exitCode = ok ? 0 : 1;
      }),
    );
}
