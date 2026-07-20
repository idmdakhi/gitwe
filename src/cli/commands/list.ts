import type { Command } from "commander";
import type { Container } from "../container";
import { reportError } from "../reportError";

export function registerListCommand(program: Command, getContainer: () => Container): void {
  program
    .command("list")
    .description("List all local branches")
    .action(async () => {
      const container = getContainer();
      try {
        const branches = await container.listBranchesHandler.handle();
        for (const branch of branches) {
          console.log(`${branch.isCurrent ? "* " : "  "}${branch.name}`);
        }
      } catch (error) {
        process.exitCode = reportError(error);
      }
    });
}
