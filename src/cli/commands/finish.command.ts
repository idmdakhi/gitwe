import { Command } from "commander";
import { loadEngine, action } from "./shared.js";
import { style } from "../output.js";
import { ValidationError } from "../../domain/errors/index.js";

export function finishCommand(): Command {
  return (
    new Command("finish")
      .description("merge a topic branch into its target(s)")
      .argument("[name]", "branch to finish (defaults to the current branch)")
      // استراتژی ادغام
      .option("--squash", "squash-merge instead of a merge commit")
      .option("--rebase", "rebase the topic branch onto its parent before merging")
      .option("--no-ff", "always create a merge commit (--no-ff)")
      // پیام‌های commit
      .option("-M, --merge-message <message>", "message for the merge commit (%b, %p)")
      .option("--squash-message <message>", "commit message for a squash merge")
      // تگ
      .option("--tag", "create a tag for the finished branch (override config)")
      .option("--no-tag", "do not create a tag (override config)")
      .option("--tagname <name>", "use a specific tag name")
      .option("-m, --message <message>", "tag message")
      .option("--sign", "sign the tag with GPG")
      .option("--signingkey <keyid>", "GPG key to sign the tag with")
      // حذف شاخه
      .option("--keep", "keep the local topic branch after finishing (--no-delete)")
      .option("--no-keep", "delete the local topic branch (default if configured)")
      .option("--keep-remote", "keep the remote topic branch after finishing")
      .option("--no-keep-remote", "delete the remote topic branch (default if configured)")
      .option("--force-delete", "delete the topic branch even if it is not fully merged")
      // همگام‌سازی با ریموت
      .option("-f, --force", "skip the remote sync check (force finish)")
      .option("--no-fetch", "do not fetch the remote before finishing")
      // نسخه‌گذاری
      .option("--current-version <semver>", "current version, for tagging")
      .option("--major", "force major version bump")
      .option("--minor", "force minor version bump")
      .option("--patch", "force patch version bump")
      // ادامه/لغو
      .option("-c, --continue", "resume a finish stopped on a conflict", false)
      .option("-a, --abort", "cancel an in-progress finish", false)
      // سایر
      .option("--push", "push targets after merging", false)
      .action(
        action(async function (this: Command, out, name: string | undefined) {
          const engine = await loadEngine(this);
          const opts = this.opts<{
            squash?: boolean;
            push: boolean;
            currentVersion?: string;
            continue: boolean;
            abort: boolean;
            // new options
            rebase?: boolean;
            noFF?: boolean;
            mergeMessage?: string;
            squashMessage?: string;
            tag?: boolean;
            noTag?: boolean;
            tagname?: string;
            message?: string;
            sign?: boolean;
            signingkey?: string;
            keep?: boolean;
            noKeep?: boolean;
            keepRemote?: boolean;
            noKeepRemote?: boolean;
            forceDelete?: boolean;
            force?: boolean;
            noFetch?: boolean;
            major?: boolean;
            minor?: boolean;
            patch?: boolean;
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

          // تعیین گزینه‌های ارسالی به Engine
          const options: any = {
            push: opts.push,
            ...(opts.squash !== undefined ? { squash: opts.squash } : {}),
            ...(opts.rebase !== undefined ? { rebase: opts.rebase } : {}),
            ...(opts.noFF !== undefined ? { noFF: opts.noFF } : {}),
            ...(opts.mergeMessage ? { mergeMessage: opts.mergeMessage } : {}),
            ...(opts.squashMessage ? { squashMessage: opts.squashMessage } : {}),
            ...(opts.tag !== undefined ? { tag: opts.tag } : {}),
            ...(opts.noTag !== undefined ? { noTag: opts.noTag } : {}),
            ...(opts.tagname ? { tagname: opts.tagname } : {}),
            ...(opts.message ? { tagMessage: opts.message } : {}),
            ...(opts.sign !== undefined ? { signTag: opts.sign } : {}),
            ...(opts.signingkey ? { signingKey: opts.signingkey } : {}),
            ...(opts.keep !== undefined ? { keep: opts.keep } : {}),
            ...(opts.noKeep !== undefined ? { keep: !opts.noKeep } : {}),
            ...(opts.keepRemote !== undefined ? { keepRemote: opts.keepRemote } : {}),
            ...(opts.noKeepRemote !== undefined ? { keepRemote: !opts.noKeepRemote } : {}),
            ...(opts.forceDelete !== undefined ? { forceDelete: opts.forceDelete } : {}),
            ...(opts.force !== undefined ? { force: opts.force } : {}),
            ...(opts.noFetch !== undefined ? { fetch: !opts.noFetch } : {}),
            ...(opts.currentVersion ? { currentVersion: opts.currentVersion } : {}),
            ...(opts.major ? { bump: "major" } : {}),
            ...(opts.minor ? { bump: "minor" } : {}),
            ...(opts.patch ? { bump: "patch" } : {}),
          };

          const result = await engine.finish(branch, options);

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
