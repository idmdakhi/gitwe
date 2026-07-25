import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import type { GetStatusQuery } from "#gitwe/application/queries/GetStatusQuery";
import type { StatusReport } from "#gitwe/application/dto/StatusReport";
import { reportError } from "#gitwe/cli/reportError";
import { printResult } from "#gitwe/cli/output";
import { renderTree } from "#gitwe/cli/renderTree";

export function registerGraphCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("graph")
    .description("Print an ASCII tree of branches and their parents")
    .option("--root <branch>", "root branch to draw the tree from", "main")
    .action(async (opts: { root: string }) => {
      const container = getContainer();
      try {
        const report = await container.kernel.run<GetStatusQuery, StatusReport>("status", {
          rootBranch: opts.root,
        });
        printResult(getJson(), report.tree, (tree) => console.log(renderTree(tree)));
      } catch (error) {
        process.exitCode = reportError(error, getJson());
      }
    });
}
