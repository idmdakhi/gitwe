import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { reportError } from "#gitwe/cli/reportError";
import { printResult } from "#gitwe/cli/output";

export function registerCurrentCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("current")
    .description("Print the current branch")
    .action(async () => {
      const container = getContainer();
      try {
        const branch = await container.git.getCurrentBranch();
        printResult(getJson(), { branch }, (r) => console.log(r.branch));
      } catch (error) {
        process.exitCode = reportError(error, getJson());
      }
    });
}
