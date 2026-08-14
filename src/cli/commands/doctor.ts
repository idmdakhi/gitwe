/**
 * `gitwe doctor` command.
 * Reports repository health and optionally applies safe fixes (RFC-0003).
 */

import type { Command } from "commander";
import type { Engine } from "../../application/engine.js";
import { runDoctor } from "../../application/engine-doctor.js";
import { print, printStructured, style } from "../output.js";
import { reportAndPrintError } from "../error-reporter.js";
import { resolveFormat } from "../options.js";

export function registerDoctorCommand(program: Command, getEngine: () => Promise<Engine>): void {
  program
    .command("doctor")
    .description("Check repository health and optionally repair common problems")
    .option("--fix", "Attempt to safely repair problems", false)
    .option("--yes", "Non-interactive; assume yes for confirmations", false)
    .action(async (opts: { fix?: boolean; yes?: boolean; format?: string }) => {
      const format = resolveFormat(opts.format);
      try {
        const engine = await getEngine();
        const report = await runDoctor(engine, {
          fix: opts.fix === true,
          yes: opts.yes === true,
        });

        if (format === "json" || format === "yaml") {
          printStructured(report, format, { command: "doctor" });
          process.exitCode = report.ok ? 0 : 1;
          return;
        }

        // Human-readable output
        if (report.findings.length === 1 && report.findings[0].severity === "ok") {
          print(style.green("✓ workflow is healthy"));
          process.exitCode = 0;
          return;
        }

        for (const f of report.findings) {
          const icon =
            f.severity === "ok"
              ? style.green("✓")
              : f.severity === "warning"
                ? style.yellow("⚠")
                : style.red("✗");

          const fixedMark = f.fixed ? style.green(" [fixed]") : "";
          print(`${icon} ${f.message}${fixedMark}`);

          if (f.suggestion && !f.fixed) {
            print(style.dim(`  → ${f.suggestion}`));
          }
        }

        if (opts.fix && report.fixedCount > 0) {
          print("");
          print(style.green(`Repaired ${report.fixedCount} issue(s).`));
        }

        process.exitCode = report.ok ? 0 : 1;
      } catch (err) {
        process.exitCode = reportAndPrintError("doctor", err, format);
      }
    });
}
