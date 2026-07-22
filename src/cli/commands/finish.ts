import type { Command } from "commander";
import type { Container } from "../container";
import { reportError } from "../reportError";
import { printResult } from "../output";
import { GitCommandError } from "../../infrastructure/git/GitCommandError";

export function registerFinishCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("finish [branchName]")
    .description("Finish a branch (default: current branch): merge into its targets, tag, and delete it")
    .option("--no-delete", "keep the branch after merging instead of deleting it")
    .option("--push", "push to the remote after finishing")
    .option("--dry-run", "show what would happen without changing anything")
    .option("--abort-on-conflict", "automatically run `git merge --abort` if a merge conflict occurs")
    .action(
      async (
        branchName: string | undefined,
        opts: { delete: boolean; push: boolean; dryRun?: boolean; abortOnConflict: boolean },
      ) => {
        const container = getContainer();
        const json = getJson();
        try {
          const target = branchName ?? (await container.git.getCurrentBranch());
          const result = await container.finishBranchHandler.handle({
            branchName: target,
            deleteAfterMerge: opts.delete,
            pushAfterFinish: opts.push,
            dryRun: opts.dryRun,
          });
          printResult(json, result, (r) => {
            const verb = r.dryRun ? "would merge" : "merged";
            console.log(`${r.dryRun ? "🔎" : "✅"} ${verb} ${target} into: ${r.merges.map((m) => m.target).join(", ")}`);
            if (r.tags.length > 0) console.log(`🏷️  ${r.dryRun ? "Would create" : "Created"} tag(s): ${r.tags.join(", ")}`);
            if (r.deleted) console.log(`🗑️  ${r.dryRun ? "Would delete" : "Deleted"} branch ${target}`);
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
