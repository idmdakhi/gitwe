import { Command } from "commander";
import { loadEngine, action } from "./shared.js";
import { style } from "../output.js";

/**
 * Lightweight doctor based on overview + validate (RFC-0003 full --fix later).
 * Does not mutate the repository; report-only.
 */
export function doctorCommand(): Command {
  return (
    new Command("doctor")
      .description("check repository health against the workflow definition")
      // .option("--fix", "Attempt to safely repair problems", false)
      // .option("--yes", "Non-interactive; assume yes for confirmations", false)
      .action(
        action(async function (this: Command, out) {
          const engine = await loadEngine(this);
          const overview = await engine.overview();
          const validation = engine.validate();

          const findings: Array<{
            severity: "ok" | "warning" | "error";
            id: string;
            message: string;
          }> = [];

          if (!validation.valid) {
            for (const issue of validation.issues) {
              findings.push({
                severity: "error",
                id: "config-invalid",
                message: `${issue.path}: ${issue.message}`,
              });
            }
          }

          if (!overview.currentBranch) {
            findings.push({
              severity: "warning",
              id: "detached-head",
              message: "HEAD is detached",
            });
          }

          if (overview.baseBranches.length === 0) {
            findings.push({
              severity: "error",
              id: "no-base",
              message: "no base branches in the workflow definition",
            });
          }

          if (findings.length === 0) {
            findings.push({
              severity: "ok",
              id: "healthy",
              message: "workflow looks healthy",
            });
          }

          const ok = findings.every((f) => f.severity !== "error");
          const report = {
            ok,
            workflow: overview.workflowName,
            currentBranch: overview.currentBranch ?? null,
            findings,
          };

          const details = findings.map((f) => {
            const icon =
              f.severity === "ok"
                ? style.green("✓")
                : f.severity === "warning"
                  ? style.yellow("!")
                  : style.red("✗");
            return `  ${icon} ${f.message}`;
          });

          out.ok({
            data: report,
            details,
          });

          process.exitCode = ok ? 0 : 1;
        }),
      )
  );
}
