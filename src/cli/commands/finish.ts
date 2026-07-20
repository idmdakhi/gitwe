import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { reportError } from "#gitwe/cli/reportError";
import { printResult } from "#gitwe/cli/output";
import { GitCommandError } from "#gitwe/infrastructure/git/GitCommandError";

export function registerFinishCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
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
        const json = getJson();
        try {
          const result = await container.finishBranchHandler.handle({
            branchName,
            deleteAfterMerge: opts.delete,
            pushAfterFinish: opts.push,
          });
          printResult(json, result, (r) => {
            console.log(
              `✅ Merged ${branchName} into: ${r.merges.map((m) => m.target).join(", ")}`,
            );
            if (r.tags.length > 0) console.log(`🏷️  Created tag(s): ${r.tags.join(", ")}`);
            if (r.deleted) console.log(`🗑️  Deleted branch ${branchName}`);
          });
        } catch (error) {
          const isConflict =
            error instanceof GitCommandError &&
            (error.stderr.includes("CONFLICT") || error.stderr.includes("Automatic merge failed"));

          if (isConflict && opts.abortOnConflict) {
            await container.git.runRaw(["merge", "--abort"]);
            printResult(json, { aborted: true }, () => {
              console.log("⚠️  Merge conflict detected. Merge aborted; working tree restored.");
            });
            return;
          }
          if (isConflict) {
            const message =
              "Merge conflict detected. Resolve conflicts manually and commit (or re-run with --abort-on-conflict).";
            if (json) {
              console.log(JSON.stringify({ error: true, code: "MERGE_CONFLICT", message }));
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
