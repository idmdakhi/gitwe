import { Command, Option } from "commander";

import type { TopicType, WorkflowConfig } from "../../domain/entities.js";
import type { Engine } from "../../application/Engine.js";
import type { FinishOptions, FinishResult } from "../../application/use-case/finish.js";
import { createEngine, type GlobalOptions } from "../context.js";
import { print, style, success } from "../output.js";

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

function reportFinish(result: FinishResult): void {
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

async function runFinish(
  engine: Engine,
  typeName: string | undefined,
  name: string | undefined,
  options: FinishCliOptions,
): Promise<void> {
  if (options.abort === true) {
    await engine.abortOperation();
    success("aborted; the repository is back to its previous state");
    return;
  }
  if (options.continue === true) {
    reportFinish(await engine.continueOperation());
    return;
  }
  const type = typeName === undefined ? undefined : engine.workflow.requireTopicType(typeName);
  const topic = await engine.resolveTarget(type, name);
  reportFinish(await engine.finish(topic, toFinishOptions(options)));
}

function registerTopicType(program: Command, type: TopicType, globals: () => GlobalOptions): void {
  const group = program
    .command(type.name)
    .description(`manage ${type.name} branches (${type.prefix}* → ${type.parent})`);

  group
    .command("start")
    .description(`create a new ${type.name} branch`)
    .argument("<name>")
    .argument("[base]", "start point (branch, tag or commit)")
    .option("--fetch", "fetch the remote before creating the branch")
    .action(async (name: string, base: string | undefined, options: { fetch?: boolean }) => {
      const engine = await createEngine(globals());
      const result = await engine.start(type.name, name, { base, fetch: options.fetch });
      success(`created ${result.branch} from ${result.startPoint}`);
    });

  addFinishOptions(
    group
      .command("finish")
      .description(`merge a ${type.name} branch into ${type.parent}`)
      .argument("[name]", "defaults to the current branch"),
  ).action(async (name: string | undefined, options: FinishCliOptions) => {
    const engine = await createEngine(globals());
    await runFinish(engine, type.name, name, options);
  });

  group
    .command("publish")
    .description(`push a ${type.name} branch to the remote`)
    .argument("[name]", "defaults to the current branch")
    .option("-o, --push-option <option>", "push option (repeatable)", collect, [])
    .option("--no-push-option", "ignore configured push options")
    .action(async (name: string | undefined, options: { pushOption?: string[] | boolean }) => {
      const engine = await createEngine(globals());
      const topic = await engine.resolveTarget(type, name);
      const pushOptions = Array.isArray(options.pushOption) ? options.pushOption : [];
      success(`published ${await engine.publish(topic, { pushOptions })}`);
    });

  group
    .command("track")
    .description(`create a local ${type.name} branch tracking the remote one`)
    .argument("<name>")
    .action(async (name: string) => {
      const engine = await createEngine(globals());
      success(`tracking ${await engine.track(type.name, name)}`);
    });

  group
    .command("list")
    .description(`list ${type.name} branches`)
    .argument("[pattern]", "shell-style glob applied to the short name")
    .action(async (pattern: string | undefined) => {
      const engine = await createEngine(globals());
      const branches = await engine.listTopics(type, pattern);
      if (branches.length === 0) {
        print(style.dim(`no ${type.name} branches`));
        return;
      }
      for (const branch of branches) {
        const marks: string[] = [];
        if (branch.ahead > 0) marks.push(`↑${branch.ahead}`);
        if (branch.behind > 0) marks.push(`↓${branch.behind}`);
        if (branch.upstream !== undefined) marks.push(branch.upstream);
        print(
          `${branch.current ? style.green("* ") : "  "}${branch.name}` +
            (marks.length > 0 ? ` ${style.dim(`(${marks.join(", ")})`)}` : ""),
        );
      }
    });

  group
    .command("update")
    .description(`update a ${type.name} branch from ${type.parent}`)
    .argument("[name]", "defaults to the current branch")
    .option("--rebase", "rebase instead of the configured downstream strategy")
    .option("--fetch", "fetch the remote first")
    .action(async (name: string | undefined, options: { rebase?: boolean; fetch?: boolean }) => {
      const engine = await createEngine(globals());
      const topic = await engine.resolveTarget(type, name);
      const result = await engine.update(topic, options);
      if (result.alreadyUpToDate) print(style.dim(`${result.branch} is already up to date`));
      else success(`updated ${result.branch} from ${result.parent} (${result.strategy})`);
    });

  group
    .command("delete")
    .description(`delete a ${type.name} branch`)
    .argument("[name]", "defaults to the current branch")
    .option("-f, --force", "delete even if the branch is not fully merged")
    .option("-r, --remote", "delete the remote branch as well")
    .action(async (name: string | undefined, options: { force?: boolean; remote?: boolean }) => {
      const engine = await createEngine(globals());
      const topic = await engine.resolveTarget(type, name);
      const result = await engine.deleteTopic(topic, options);
      success(`deleted ${result.branch}${result.deletedRemote ? " (local and remote)" : ""}`);
    });

  group
    .command("rename")
    .description(`rename a ${type.name} branch`)
    .argument("<old>")
    .argument("[new]")
    .action(async (oldName: string, newName: string | undefined) => {
      const engine = await createEngine(globals());
      const [from, to] =
        newName === undefined
          ? [(await engine.currentTopic()).branch, oldName]
          : [oldName, newName];
      const topic = await engine.resolveTarget(type, from);
      success(`renamed ${topic.branch} → ${await engine.rename(topic, to)}`);
    });

  group
    .command("checkout")
    .description(`switch to a ${type.name} branch (partial names allowed)`)
    .argument("<name>")
    .action(async (name: string) => {
      const engine = await createEngine(globals());
      success(`switched to ${await engine.checkout(type, name)}`);
    });
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

/** Shorthands that operate on the current branch or an explicit branch name. */
function registerShorthands(program: Command, globals: () => GlobalOptions): void {
  program
    .command("start")
    .description("create a new topic branch")
    .argument("<type>", "topic type")
    .argument("<name>")
    .argument("[base]", "start point (branch, tag or commit)")
    .option("--fetch", "fetch the remote before creating the branch")
    .action(
      async (
        typeName: string,
        name: string,
        base: string | undefined,
        options: { fetch?: boolean },
      ) => {
        const engine = await createEngine(globals());
        const result = await engine.start(typeName, name, { base, fetch: options.fetch });
        success(`created ${result.branch} from ${result.startPoint}`);
      },
    );

  addFinishOptions(
    program
      .command("finish")
      .description("finish the current (or named) topic branch")
      .argument("[name]"),
  ).action(async (name: string | undefined, options: FinishCliOptions) => {
    const engine = await createEngine(globals());
    await runFinish(engine, undefined, name, options);
  });

  program
    .command("update")
    .description("update the current (or named) topic branch from its parent")
    .argument("[name]")
    .option("--rebase", "rebase instead of the configured downstream strategy")
    .option("--fetch", "fetch the remote first")
    .action(async (name: string | undefined, options: { rebase?: boolean; fetch?: boolean }) => {
      const engine = await createEngine(globals());
      const topic = await engine.resolveTarget(undefined, name);
      const result = await engine.update(topic, options);
      if (result.alreadyUpToDate) print(style.dim(`${result.branch} is already up to date`));
      else success(`updated ${result.branch} from ${result.parent} (${result.strategy})`);
    });

  program
    .command("rebase")
    .description("update the current (or named) topic branch by rebasing")
    .argument("[name]")
    .action(async (name: string | undefined) => {
      const engine = await createEngine(globals());
      const topic = await engine.resolveTarget(undefined, name);
      const result = await engine.update(topic, { rebase: true });
      if (result.alreadyUpToDate) print(style.dim(`${result.branch} is already up to date`));
      else success(`rebased ${result.branch} onto ${result.parent}`);
    });

  program
    .command("publish")
    .description("push the current (or named) topic branch")
    .argument("[name]")
    .addOption(
      new Option("-o, --push-option <option>", "push option (repeatable)")
        .argParser(collect)
        .default([]),
    )
    .action(async (name: string | undefined, options: { pushOption?: string[] }) => {
      const engine = await createEngine(globals());
      const topic = await engine.resolveTarget(undefined, name);
      success(`published ${await engine.publish(topic, { pushOptions: options.pushOption })}`);
    });

  program
    .command("delete")
    .description("delete the current (or named) topic branch")
    .argument("[name]")
    .option("-f, --force", "delete even if the branch is not fully merged")
    .option("-r, --remote", "delete the remote branch as well")
    .action(async (name: string | undefined, options: { force?: boolean; remote?: boolean }) => {
      const engine = await createEngine(globals());
      const topic = await engine.resolveTarget(undefined, name);
      const result = await engine.deleteTopic(topic, options);
      success(`deleted ${result.branch}${result.deletedRemote ? " (local and remote)" : ""}`);
    });

  program
    .command("rename")
    .description("rename the current topic branch")
    .argument("<new-name>")
    .action(async (newName: string) => {
      const engine = await createEngine(globals());
      const topic = await engine.currentTopic();
      success(`renamed ${topic.branch} → ${await engine.rename(topic, newName)}`);
    });
}

/** Register the per-type command groups declared by the workflow definition. */
export function registerTopicCommands(
  program: Command,
  config: WorkflowConfig,
  globals: () => GlobalOptions,
): void {
  for (const type of config.topicTypes) registerTopicType(program, type, globals);
  registerShorthands(program, globals);
}
