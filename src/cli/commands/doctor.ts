import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { reportError } from "#gitwe/cli/reportError";
import { printResult } from "#gitwe/cli/output";

export function registerDoctorCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("doctor")
    .description("Run sanity checks against the repo and the active workflow")
    .action(async () => {
      const container = getContainer();
      try {
        const report = await container.doctorHandler.handle();
        printResult(getJson(), report, (r) => {
          for (const check of r.checks) {
            const icon = check.passed ? "✅" : "❌";
            const detail = check.detail ? ` — ${check.detail}` : "";
            console.log(`${icon} ${check.name}${detail}`);
          }
        });
        if (!report.healthy) process.exitCode = 1;
      } catch (error) {
        process.exitCode = reportError(error, getJson());
      }
    });
}
