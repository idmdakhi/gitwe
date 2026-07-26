import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { reportError } from "#gitwe/cli/reportError";
import { printResult } from "#gitwe/cli/output";

export function registerSyncCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("sync")
    .description("Update all topic branches by merging or rebasing their base branches into them.")
    .option("--rebase", "use rebase instead of merge to catch up")
    .option("--push", "push updated branches to remote")
    .option("--all", "sync all branches (including protected ones)", false)
    .action(async (opts: { rebase?: boolean; push?: boolean; all?: boolean }) => {
      const container = getContainer();
      const json = getJson();
      try {
        const branches = await container.git.listBranches();
        const currentBranch = await container.git.getCurrentBranch();
        const results: Array<{ branch: string; status: string; error?: string }> = [];

        for (const branch of branches) {
          if (!opts.all && branch.name === currentBranch) continue;
          if (!opts.all && container.workflow.isProtected(branch.name)) continue;

          const rule = container.workflow.findRuleForBranch(branch.name);
          if (!rule) continue;

          const strategy = opts.rebase ? "rebase" : "merge";
          try {
            const result = await container.updateBranchHandler.handle({
              branchName: branch.name,
              strategy,
            });
            results.push({
              branch: branch.name,
              status:
                result.strategy === "rebase"
                  ? `rebased onto ${result.parent}`
                  : `merged ${result.parent} into it`,
            });

            if (opts.push) {
              await container.git.push("origin", branch.name);
            }
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            results.push({
              branch: branch.name,
              status: "failed",
              error: message,
            });
          }
        }

        printResult(json, results, (list) => {
          if (list.length === 0) {
            console.log("No topic branches to sync.");
            return;
          }
          for (const item of list) {
            const icon = item.error ? "❌" : "✅";
            console.log(
              `${icon} ${item.branch}: ${item.status}${item.error ? ` (${item.error})` : ""}`,
            );
          }
        });
      } catch (error) {
        process.exitCode = reportError(error, getJson());
      }
    });
}
