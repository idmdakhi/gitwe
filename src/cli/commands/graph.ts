import type { Command } from "commander";
import type { Container } from "../container";
import { reportError } from "../reportError";
import { printResult } from "../output";
import { renderTree } from "../renderTree";

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
        const report = await container.getStatusHandler.handle({ rootBranch: opts.root });
        printResult(getJson(), report.tree, (tree) => console.log(renderTree(tree)));
      } catch (error) {
        process.exitCode = reportError(error, getJson());
      }
    });
}

