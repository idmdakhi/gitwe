import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import type { GetStatusQuery } from "#gitwe/application/queries/GetStatusQuery";
import type { StatusReport } from "#gitwe/application/dto/StatusReport";
import { reportError } from "#gitwe/cli/reportError";
import { printResult } from "#gitwe/cli/output";

export function registerStatusCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("status")
    .description("Show the current branch and a summary of the repository")
    .option("--root <branch>", "root branch to summarize from", "main")
    .action(async (opts: { root: string }) => {
      const container = getContainer();
      try {
        const report = await container.kernel.run<GetStatusQuery, StatusReport>("status", {
          rootBranch: opts.root,
        });
        printResult(getJson(), report, (r) => {
          console.log(`On branch: ${r.currentBranch}`);
          console.log(`Total branches: ${r.totalBranches}`);
          console.log(`Workflow branch types: ${r.branchTypes.join(", ")}`);
        });
      } catch (error) {
        process.exitCode = reportError(error, getJson());
      }
    });
}
