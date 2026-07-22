import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { reportError } from "#gitwe/cli/reportError";
import { printResult } from "#gitwe/cli/output";

export function registerPullCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("pull")
    .description("Pull the current branch from the configured remote")
    .option("--remote <name>", "remote to pull from (overrides the workflow's configured remote)")
    .action(async (opts: { remote?: string }) => {
      const container = getContainer();
      try {
        const remote = opts.remote ?? container.workflow.remote.remote;
        await container.git.pull(remote);
        printResult(getJson(), { remote }, (r) => console.log(`✅ Pulled from ${r.remote}.`));
      } catch (error) {
        process.exitCode = reportError(error, getJson());
      }
    });
}
