import { Command } from "commander";
import { loadEngine, action } from "./shared.js";
import { style } from "../output.js";
import { ValidationError } from "../../domain/errors/index.js";

export function finishCommand(): Command {
  return (
    new Command("finish")
      .description("merge a topic branch into its target(s)")
      .argument("[name]", "branch to finish (defaults to the current branch)")
      .option("--squash", "squash-merge instead of a merge commit")
      .option("--push", "push targets after merging", false)
      .option("--current-version <semver>", "current version, for tagging")
      .option("-c, --continue", "resume a finish stopped on a conflict", false)
      .option("-a, --abort", "cancel an in-progress finish", false)
      // .option("-f, --force", "skip the remote sync check")
      // .option("--no-fetch", "do not fetch the remote before finishing")
      // .option("--keep,--no-delete", "keep the topic branch after finishing")
      // .option("--keep-remote,--no-delete-remote", "keep the remote topic branch")
      // .option("--force-delete", "delete the topic branch even if it is not fully merged")
      // .option("--tag", "create a tag for the finished branch")
      // .option("--no-tag", "do not create a tag")
      // .option("--tagname <name>", "use a specific tag name")
      // .option("-m, --message <message>", "tag message")
      // .option("--sign", "sign the tag with GPG")
      // .option("--signingkey <keyid>", "GPG key to sign the tag with")
      // .option("--rebase", "rebase the topic branch onto its parent before merging")
      // .option("--no-ff", "always create a merge commit")
      // .option("-M, --merge-message <message>", "message for the merge into the parent (%b, %p)")
      // .option("--squash-message <message>", "commit message for a squash merge")
      // .option("--update-message <message>", "message for parent → child updates (%b, %p)")
      // .option("--no-verify", "bypass git hooks during merges")
      // .option("--no-interactive", "disable interactive prompts (use defaults)")
      // .option("--major", "force major version bump")
      // .option("--minor", "force minor version bump")
      // .option("--patch", "force patch version bump")
      .action(
        action(async function (this: Command, out, name: string | undefined) {
          const engine = await loadEngine(this);
          const opts = this.opts<{
            squash?: boolean;
            push: boolean;
            currentVersion?: string;
            continue: boolean;
            abort: boolean;
          }>();

          if (opts.abort) {
            await engine.abortFinish();
            out.ok({
              data: { aborted: true },
              message: "finish aborted",
            });
            return;
          }

          if (opts.continue) {
            const result = await engine.continueFinish();
            out.ok({
              data: result,
              message: `finished ${result.branch} → ${result.mergedInto.join(", ")}`,
              details: [
                ...(result.tag ? [`tagged ${result.tag}`] : []),
                ...(result.deleted ? [style.dim(`deleted ${result.branch}`)] : []),
              ],
            });
            return;
          }

          const branch = name ?? (await engine.overview()).currentBranch;
          if (!branch) {
            throw new ValidationError(
              "no branch specified and none is currently checked out",
              "pass a branch name or check out a topic branch first",
            );
          }

          const result = await engine.finish(branch, {
            ...(opts.squash !== undefined ? { squash: opts.squash } : {}),
            push: opts.push,
            ...(opts.currentVersion ? { currentVersion: opts.currentVersion } : {}),
          });

          out.ok({
            data: result,
            message: `finished ${result.branch} → ${result.mergedInto.join(", ")}`,
            details: [
              ...(result.tag ? [`tagged ${result.tag}`] : []),
              ...(result.deleted ? [style.dim(`deleted ${result.branch}`)] : []),
            ],
          });
        }),
      )
  );
}
