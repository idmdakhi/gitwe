import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { reportError } from "#gitwe/cli/reportError";
import { printResult } from "#gitwe/cli/output";

export function registerCheckoutCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("checkout <branchName>")
    .description("Check out an existing branch")
    .action(async (branchName: string) => {
      const container = getContainer();
      try {
        await container.git.checkout(branchName);
        printResult(getJson(), { branch: branchName }, (r) =>
          console.log(`✅ Switched to ${r.branch}.`),
        );
      } catch (error) {
        process.exitCode = reportError(error, getJson());
      }
    });
}
