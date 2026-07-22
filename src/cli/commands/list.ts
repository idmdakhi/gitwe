import type { Command } from "commander";
import type { Container } from "../container";
import { reportError } from "../reportError";
import { printResult } from "../output";

export function registerListCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("list")
    .description("List all local branches")
    .action(async () => {
      const container = getContainer();
      try {
        const branches = await container.listBranchesHandler.handle();
        printResult(getJson(), branches, (list) => {
          for (const branch of list) {
            console.log(`${branch.isCurrent ? "* " : "  "}${branch.name}`);
          }
        });
      } catch (error) {
        process.exitCode = reportError(error, getJson());
      }
    });
}
