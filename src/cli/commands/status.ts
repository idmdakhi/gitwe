import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { reportError } from "#gitwe/cli/reportError";

export function registerStatusCommand(program: Command, getContainer: () => Container): void {
  program
    .command("status")
    .description("Show the current branch and a summary of the repository")
    .option("--root <branch>", "root branch to summarize from", "main")
    .action(async (opts: { root: string }) => {
      const container = getContainer();
      try {
        const report = await container.getStatusHandler.handle({ rootBranch: opts.root });
        console.log(`On branch: ${report.currentBranch}`);
        console.log(`Total branches: ${report.totalBranches}`);
        console.log(`Workflow branch types: ${report.branchTypes.join(", ")}`);
      } catch (error) {
        process.exitCode = reportError(error);
      }
    });
}
