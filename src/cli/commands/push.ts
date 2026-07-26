import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { reportError } from "#gitwe/cli/reportError";
import { printResult } from "#gitwe/cli/output";

export function registerPushCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("push")
    .description("Push the current branch to the configured remote")
    .option("--remote <name>", "remote to push to (overrides the workflow's configured remote)")
    .action(async (opts: { remote?: string }) => {
      const container = getContainer();
      try {
        const remote = opts.remote ?? container.workflow.remote.remote;
        await container.git.push(remote);
        printResult(getJson(), { remote }, (r) => console.log(`✅ Pushed to ${r.remote}.`));
      } catch (error) {
        process.exitCode = reportError(error, getJson());
      }
    });
}
