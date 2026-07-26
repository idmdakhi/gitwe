import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import type { UpdateBranchCommand } from "#gitwe/application/commands/UpdateBranchCommand";
import type { UpdateBranchResult } from "#gitwe/application/dto/UpdateBranchResult";
import type { UpdateStrategy } from "#gitwe/domain/valueObjects/UpdateStrategy";
import { reportError } from "#gitwe/cli/reportError";
import { printResult } from "#gitwe/cli/output";
import { GitCommandError } from "#gitwe/infrastructure/git/GitCommandError";

export function registerUpdateCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("update [branchName]")
    .description("Bring a topic branch up to date with its base branch (default: current branch)")
    .option("--merge", "use a merge to catch up, overriding the branch type's default")
    .option("--rebase", "rebase onto the base branch, overriding the branch type's default")
    .option(
      "--abort-on-conflict",
      "automatically abort (merge --abort / rebase --abort) if a conflict occurs",
    )
    .action(
      async (
        branchName: string | undefined,
        opts: { merge?: boolean; rebase?: boolean; abortOnConflict: boolean },
      ) => {
        const container = getContainer();
        const json = getJson();
        let strategy: UpdateStrategy | undefined;
        if (opts.merge && opts.rebase) {
          console.error("❌ Pass at most one of --merge / --rebase.");
          process.exitCode = 1;
          return;
        }
        if (opts.rebase) strategy = "rebase";
        if (opts.merge) strategy = "merge";

        try {
          const target = branchName ?? (await container.git.getCurrentBranch());
          const result = await container.kernel.run<UpdateBranchCommand, UpdateBranchResult>(
            "update",
            { branchName: target, strategy },
          );
          printResult(json, result, (r) => {
            if (r.strategy === "rebase") {
              console.log(`✅ Rebased ${r.branchName} onto ${r.parent}`);
            } else {
              console.log(
                r.fastForward
                  ? `✅ Fast-forwarded ${r.branchName} to ${r.parent}`
                  : `✅ Merged ${r.parent} into ${r.branchName}`,
              );
            }
          });
        } catch (error) {
          const isConflict =
            error instanceof GitCommandError &&
            (error.stdout.includes("CONFLICT") ||
              error.stdout.includes("Automatic merge failed") ||
              error.stderr.includes("CONFLICT") ||
              error.stderr.includes("Automatic merge failed"));

          if (isConflict && opts.abortOnConflict) {
            await container.git.runRaw(
              strategy === "rebase" ? ["rebase", "--abort"] : ["merge", "--abort"],
            );
            printResult(json, { aborted: true }, () => {
              console.log("⚠️  Conflict detected. Aborted; working tree restored.");
            });
            return;
          }
          if (isConflict) {
            const message =
              "Conflict detected. Resolve conflicts manually and commit (or re-run with --abort-on-conflict).";
            if (json) {
              console.log(JSON.stringify({ error: true, code: "UPDATE_CONFLICT", message }));
            } else {
              console.error(`❌ ${message}`);
            }
            process.exitCode = 1;
            return;
          }
          process.exitCode = reportError(error, json);
        }
      },
    );
}
