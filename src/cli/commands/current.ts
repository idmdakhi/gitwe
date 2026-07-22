import type { Command } from "commander";
import type { Container } from "../container";
import { reportError } from "../reportError";
import { printResult } from "../output";

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
