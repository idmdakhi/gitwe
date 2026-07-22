import type { Command } from "commander";
import type { Container } from "../container";
import { reportError } from "../reportError";
import { printResult } from "../output";

export function registerCheckoutCommand(program: Command, getContainer: () => Container, getJson: () => boolean): void {
  program
    .command("checkout <branchName>")
    .description("Check out an existing branch")
    .action(async (branchName: string) => {
      const container = getContainer();
      try {
        await container.git.checkout(branchName);
        printResult(getJson(), { branch: branchName }, (r) => console.log(`✅ Switched to ${r.branch}.`));
      } catch (error) {
        process.exitCode = reportError(error, getJson());
      }
    });
}
