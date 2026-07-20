import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { reportError } from "#gitwe/cli/reportError";

export function registerCurrentCommand(program: Command, getContainer: () => Container): void {
  program
    .command("current")
    .description("Print the current branch")
    .action(async () => {
      const container = getContainer();
      try {
        console.log(await container.git.getCurrentBranch());
      } catch (error) {
        process.exitCode = reportError(error);
      }
    });
}
