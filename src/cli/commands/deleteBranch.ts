import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { reportError } from "#gitwe/cli/reportError";
import { printResult } from "#gitwe/cli/output";
import { ProtectedBranchError } from "#gitwe/domain/errors";

export function registerDeleteCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("delete <branchName>")
    .description("Delete a local branch")
    .option("-f, --force", "delete even if the branch isn't fully merged (git branch -D)")
    .action(async (branchName: string, opts: { force?: boolean }) => {
      const container = getContainer();
      const json = getJson();
      try {
        if (container.workflow.isProtected(branchName)) {
          throw new ProtectedBranchError(branchName, "deleted");
        }
        await container.git.deleteBranch(branchName, opts.force);
        printResult(json, { branch: branchName }, (r) => console.log(`🗑️  Deleted ${r.branch}.`));
      } catch (error) {
        process.exitCode = reportError(error, json);
      }
    });
}
