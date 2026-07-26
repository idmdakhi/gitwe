import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { reportError } from "#gitwe/cli/reportError";
import { printResult } from "#gitwe/cli/output";

export function registerAbortCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("abort")
    .description("Abort an in-progress merge (git merge --abort)")
    .action(async () => {
      const container = getContainer();
      try {
        await container.git.runRaw(["merge", "--abort"]);
        printResult(getJson(), { aborted: true }, () =>
          console.log("✅ Merge aborted; working tree restored."),
        );
      } catch (error) {
        process.exitCode = reportError(error, getJson());
      }
    });
}
