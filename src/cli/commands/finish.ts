import { Command } from "commander";
import { createEngine } from "../context.js";
import { print, style, success, printStructured } from "../output.js";
import type { GlobalOptions } from "../options.js";
import type { FinishResult } from "../../application/use-case/finish.js";

interface FinishCliOptions {
  continue?: boolean;
  abort?: boolean;
  force?: boolean;
  fetch?: boolean;
  keep?: boolean;
  keepRemote?: boolean;
  forceDelete?: boolean;
  tag?: boolean;
  tagname?: string;
  message?: string;
  sign?: boolean;
  signingkey?: string;
  squash?: boolean;
  rebase?: boolean;
  ff?: boolean;
  mergeMessage?: string;
  squashMessage?: string;
  updateMessage?: string;
  noVerify?: boolean;
  push?: boolean;
  interactive?: boolean;
  "no-interactive"?: boolean;
  major?: boolean;
  minor?: boolean;
  patch?: boolean;
}

function reportFinish(result: FinishResult, format?: "text" | "json" | "yaml" | "table"): void {
  if (format === "json" || format === "yaml") {
    printStructured(result, format);
    return;
  }
  success(`${result.branch} → ${result.base} (${result.strategy})`);
  if (result.tag !== undefined) success(`tagged ${result.tag}`);
  for (const branch of result.updatedBranches) success(`updated ${branch}`);
  if (result.deletedLocal) success(`deleted local branch ${result.branch}`);
  if (result.deletedRemote) success(`deleted remote branch ${result.branch}`);
  print(style.dim(`now on ${result.finalBranch}`));
}

export function registerFinish(program: Command, globals: () => GlobalOptions): void {
  program
    .command("finish")
    .description("finish the current (or named) topic branch")
    .argument("[name]", "branch name, defaults to the current branch")
    .option("-c, --continue", "continue a finish that stopped on conflicts")
    .option("-a, --abort", "abort a finish and restore the previous state")
    .option("-f, --force", "skip the remote sync check")
    .option("--no-fetch", "do not fetch the remote before finishing")
    .option("--keep,--no-delete", "keep the topic branch after finishing")
    .option("--keep-remote,--no-delete-remote", "keep the remote topic branch")
    .option("--force-delete", "delete the topic branch even if it is not fully merged")
    .option("--tag", "create a tag for the finished branch")
    .option("--no-tag", "do not create a tag")
    .option("--tagname <name>", "use a specific tag name")
    .option("-m, --message <message>", "tag message")
    .option("--sign", "sign the tag with GPG")
    .option("--signingkey <keyid>", "GPG key to sign the tag with")
    .option("--squash", "squash the topic branch into a single commit")
    .option("--rebase", "rebase the topic branch onto its parent before merging")
    .option("--no-ff", "always create a merge commit")
    .option("-M, --merge-message <message>", "message for the merge into the parent (%b, %p)")
    .option("--squash-message <message>", "commit message for a squash merge")
    .option("--update-message <message>", "message for parent → child updates (%b, %p)")
    .option("--no-verify", "bypass git hooks during merges")
    .option("--push", "push the updated base branches when finished")
    .option("--no-interactive", "disable interactive prompts (use defaults)")
    .option("--major", "force major version bump")
    .option("--minor", "force minor version bump")
    .option("--patch", "force patch version bump")
    .action(async (name: string | undefined, opts: FinishCliOptions) => {
      const engine = await createEngine(globals());
      const format = globals().format;

      if (opts.abort === true) {
        await engine.abortOperation();
        success("aborted; the repository is back to its previous state");
        return;
      }
      let result: FinishResult;
      if (opts.continue === true) {
        result = await engine.continueOperation();
      } else {
        const topic = await engine.resolveTarget(undefined, name);
        result = await engine.finish(topic, {
          fetch: opts.fetch,
          force: opts.force,
          keep: opts.keep,
          keepRemote: opts.keepRemote,
          forceDelete: opts.forceDelete,
          tag: opts.tag,
          tagName: opts.tagname,
          message: opts.message,
          sign: opts.sign,
          signingKey: opts.signingkey,
          squash: opts.squash,
          rebase: opts.rebase,
          noFf: opts.ff === false ? true : undefined,
          mergeMessage: opts.mergeMessage,
          squashMessage: opts.squashMessage,
          updateMessage: opts.updateMessage,
          noVerify: opts.noVerify,
          push: opts.push,
          interactive: opts.interactive !== false && !opts["no-interactive"],
          major: opts.major,
          minor: opts.minor,
          patch: opts.patch,
        });
      }
      reportFinish(result, format);
    });
}
