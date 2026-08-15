import { Command } from "commander";
import { loadEngine, action } from "./shared.js";

export function finishCommand(): Command {
  return new Command("finish")
    .description("merge a topic branch into its target(s)")
    .argument("[name]", "branch to finish (defaults to the current branch)")
    .option("--squash", "squash-merge instead of a merge commit")
    .option("--push", "push targets after merging", false)
    .option("--current-version <semver>", "current version, for tagging")
    .option("--continue", "resume a finish stopped on a conflict", false)
    .option("--abort", "cancel an in-progress finish", false)
    .action(
      action(async function (this: Command, name: string | undefined) {
        const engine = await loadEngine(this);
        const opts = this.opts<{
          squash?: boolean; push: boolean; currentVersion?: string; continue: boolean; abort: boolean;
        }>();

        if (opts.abort) {
          await engine.abortFinish();
          console.log("finish aborted");
          return;
        }
        if (opts.continue) {
          const result = await engine.continueFinish();
          console.log(`finished ${result.branch} -> ${result.mergedInto.join(", ")}`);
          return;
        }

        const branch = name ?? (await engine.overview()).currentBranch;
        if (!branch) throw new Error("no branch specified and none is currently checked out");

        const result = await engine.finish(branch, {
          ...(opts.squash !== undefined ? { squash: opts.squash } : {}),
          push: opts.push,
          ...(opts.currentVersion ? { currentVersion: opts.currentVersion } : {}),
        });
        console.log(`finished ${result.branch} -> ${result.mergedInto.join(", ")}`);
        if (result.tag) console.log(`tagged ${result.tag}`);
        if (result.deleted) console.log(`deleted ${result.branch}`);
      }),
    );
}
