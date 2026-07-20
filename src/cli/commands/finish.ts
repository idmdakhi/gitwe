import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { reportError } from "#gitwe/cli/reportError";
import { GitCommandError } from "#gitwe/infrastructure/git/GitCommandError";

export function registerFinishCommand(program: Command, getContainer: () => Container): void {
  program
    .command("finish <branchName>")
    .description("Finish a branch: merge it into its configured targets, tag, and delete it")
    .option("--no-delete", "keep the branch after merging instead of deleting it")
    .option("--push", "push to the remote after finishing")
    .option(
      "--abort-on-conflict",
      "automatically run `git merge --abort` if a merge conflict occurs",
    )
    .action(
      async (
        branchName: string,
        opts: { delete: boolean; push: boolean; abortOnConflict: boolean },
      ) => {
        const container = getContainer();
        try {
          const result = await container.finishBranchHandler.handle({
            branchName,
            deleteAfterMerge: opts.delete,
            pushAfterFinish: opts.push,
          });
          console.log(
            `✅ Merged ${branchName} into: ${result.merges.map((m) => m.target).join(", ")}`,
          );
          if (result.tags.length > 0) console.log(`🏷️  Created tag(s): ${result.tags.join(", ")}`);
          if (result.deleted) console.log(`🗑️  Deleted branch ${branchName}`);
        } catch (error) {
          const isConflict =
            error instanceof GitCommandError &&
            (error.stderr.includes("CONFLICT") || error.stderr.includes("Automatic merge failed"));

          if (isConflict && opts.abortOnConflict) {
            console.log("⚠️  Merge conflict detected. Aborting merge...");
            await container.git.runRaw(["merge", "--abort"]);
            console.log("Merge aborted; working tree restored to its pre-merge state.");
            return;
          }
          if (isConflict) {
            console.error(
              "❌ Merge conflict detected! Resolve conflicts manually and commit " +
                "(or re-run with --abort-on-conflict).",
            );
            process.exitCode = 1;
            return;
          }
          process.exitCode = reportError(error);
        }
      },
    );
}
