import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { reportError } from "#gitwe/cli/reportError";
import { renderTree } from "#gitwe/cli/renderTree";

export function registerGraphCommand(program: Command, getContainer: () => Container): void {
  program
    .command("graph")
    .description("Print an ASCII tree of branches and their parents")
    .option("--root <branch>", "root branch to draw the tree from", "main")
    .action(async (opts: { root: string }) => {
      const container = getContainer();
      try {
        const report = await container.getStatusHandler.handle({ rootBranch: opts.root });
        console.log(renderTree(report.tree));
      } catch (error) {
        process.exitCode = reportError(error);
      }
    });
}
