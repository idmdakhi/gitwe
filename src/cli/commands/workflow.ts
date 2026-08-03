import { Command, Option } from "commander";
import type { Engine } from "../../application/Engine.js";
import type { FinishOptions, FinishResult } from "../../application/use-case/finish.js";
import { createEngine } from "../context.js";
import type { GlobalOptions } from "../options.js";
import { print, style, success, printStructured } from "../output.js";

// ---------- گزینه‌های finish ----------
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
}

function toFinishOptions(options: FinishCliOptions): FinishOptions {
  return {
    fetch: options.fetch,
    force: options.force,
    keep: options.keep,
    keepRemote: options.keepRemote,
    forceDelete: options.forceDelete,
    tag: options.tag,
    tagName: options.tagname,
    message: options.message,
    sign: options.sign,
    signingKey: options.signingkey,
    squash: options.squash,
    rebase: options.rebase,
    noFf: options.ff === false ? true : undefined,
    mergeMessage: options.mergeMessage,
    squashMessage: options.squashMessage,
    updateMessage: options.updateMessage,
    noVerify: options.noVerify,
    push: options.push,
  };
}

function reportFinish(result: FinishResult, format?: "text" | "json" | "yaml" | "table"): void {
  if (format === "json" || format === "yaml") {
    printStructured(result, format);
    return;
  }
  success(`${result.branch} → ${result.parent} (${result.strategy})`);
  if (result.tag !== undefined) success(`tagged ${result.tag}`);
  for (const branch of result.updatedBranches) success(`updated ${branch}`);
  if (result.deletedLocal) success(`deleted local branch ${result.branch}`);
  if (result.deletedRemote) success(`deleted remote branch ${result.branch}`);
  print(style.dim(`now on ${result.finalBranch}`));
}

function addFinishOptions(command: Command): Command {
  return command
    .option("-c, --continue", "continue a finish that stopped on conflicts")
    .option("-a, --abort", "abort a finish and restore the previous state")
    .option("-f, --force", "skip the remote sync check")
    .option("--no-fetch", "do not fetch the remote before finishing")
    .option("--keep", "keep the topic branch after finishing")
    .option("--keepremote", "keep the remote topic branch")
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
    .option("--push", "push the updated base branches when finished");
}

// ---------- توابع کمکی برای finish ----------
async function runFinish(
  engine: Engine,
  typeName: string | undefined,
  name: string | undefined,
  options: FinishCliOptions,
  format?: "text" | "json" | "yaml" | "table",
): Promise<void> {
  if (options.abort === true) {
    await engine.abortOperation();
    success("aborted; the repository is back to its previous state");
    return;
  }
  if (options.continue === true) {
    reportFinish(await engine.continueOperation(), format);
    return;
  }
  const type = typeName === undefined ? undefined : engine.workflow.requireTopicType(typeName);
  const topic = await engine.resolveTarget(type, name);
  reportFinish(await engine.finish(topic, toFinishOptions(options)), format);
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

// ---------- ثبت دستورات ----------
export function registerWorkflowCommands(program: Command, globals: () => GlobalOptions): void {
  const getFormat = () => globals().format;
  // start
  program
    .command("start")
    .description("create a new topic branch")
    .argument("<type>", "topic type (e.g. feature, release)")
    .argument("<name>", "short name of the branch")
    .argument("[base]", "start point (branch, tag or commit)")
    .option("--fetch", "fetch the remote before creating the branch")
    .action(
      async (
        typeName: string,
        name: string,
        base: string | undefined,
        opts: { fetch?: boolean },
      ) => {
        const engine = await createEngine(globals());
        const result = await engine.start(typeName, name, { base, fetch: opts.fetch });
        const data = { branch: result.branch, startPoint: result.startPoint };
        if (getFormat() === "json" || getFormat() === "yaml") {
          printStructured(data, getFormat()!);
        } else {
          success(`created ${result.branch} from ${result.startPoint}`);
        }
      },
    );

  // finish
  addFinishOptions(
    program
      .command("finish")
      .description("finish the current (or named) topic branch")
      .argument("[name]", "branch name, defaults to the current branch"),
  ).action(async (name: string | undefined, opts: FinishCliOptions) => {
    const engine = await createEngine(globals());
    await runFinish(engine, undefined, name, opts, getFormat());
  });

  // update
  program
    .command("update")
    .description("update the current (or named) topic branch from its parent")
    .argument("[name]")
    .option("--rebase", "rebase instead of the configured downstream strategy")
    .option("--fetch", "fetch the remote first")
    .action(async (name: string | undefined, opts: { rebase?: boolean; fetch?: boolean }) => {
      const engine = await createEngine(globals());
      const topic = await engine.resolveTarget(undefined, name);
      const result = await engine.update(topic, opts);
      if (getFormat() === "json" || getFormat() === "yaml") {
        printStructured(result, getFormat()!);
      } else if (result.alreadyUpToDate) {
        print(style.dim(`${result.branch} is already up to date`));
      } else {
        success(`updated ${result.branch} from ${result.parent} (${result.strategy})`);
      }
    });

  // rebase (alias for update --rebase)
  program
    .command("rebase")
    .description("update the current (or named) topic branch by rebasing")
    .argument("[name]")
    .action(async (name: string | undefined) => {
      const engine = await createEngine(globals());
      const topic = await engine.resolveTarget(undefined, name);
      const result = await engine.update(topic, { rebase: true });
      if (getFormat() === "json" || getFormat() === "yaml") {
        printStructured(result, getFormat()!);
      } else if (result.alreadyUpToDate) {
        print(style.dim(`${result.branch} is already up to date`));
      } else {
        success(`rebased ${result.branch} onto ${result.parent}`);
      }
    });

  // publish
  program
    .command("publish")
    .description("push the current (or named) topic branch")
    .argument("[name]")
    .addOption(
      new Option("-o, --push-option <option>", "push option (repeatable)")
        .argParser(collect)
        .default([]),
    )
    .action(async (name: string | undefined, opts: { pushOption?: string[] }) => {
      const engine = await createEngine(globals());
      const topic = await engine.resolveTarget(undefined, name);
      const published = await engine.publish(topic, { pushOptions: opts.pushOption });
      const data = { remote: published };
      if (getFormat() === "json" || getFormat() === "yaml") {
        printStructured(data, getFormat()!);
      } else {
        success(`published ${published}`);
      }
    });

  // delete
  program
    .command("delete")
    .description("delete the current (or named) topic branch")
    .argument("[name]")
    .option("-f, --force", "delete even if the branch is not fully merged")
    .option("-r, --remote", "delete the remote branch as well")
    .action(async (name: string | undefined, opts: { force?: boolean; remote?: boolean }) => {
      const engine = await createEngine(globals());
      const topic = await engine.resolveTarget(undefined, name);
      const result = await engine.deleteTopic(topic, opts);
      const data = { branch: result.branch, deletedRemote: result.deletedRemote };
      if (getFormat() === "json" || getFormat() === "yaml") {
        printStructured(data, getFormat()!);
      } else {
        success(`deleted ${result.branch}${result.deletedRemote ? " (local and remote)" : ""}`);
      }
    });

  // rename
  program
    .command("rename")
    .description("rename the current topic branch")
    .argument("<new-name>")
    .action(async (newName: string) => {
      const engine = await createEngine(globals());
      const topic = await engine.currentTopic();
      const renamed = await engine.rename(topic, newName);
      const data = { old: topic.branch, new: renamed };
      if (getFormat() === "json" || getFormat() === "yaml") {
        printStructured(data, getFormat()!);
      } else {
        success(`renamed ${topic.branch} → ${renamed}`);
      }
    });
}
