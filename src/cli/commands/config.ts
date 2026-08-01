import { Command } from "commander";

import {
  addBaseBranch,
  addTopicType,
  deleteBaseBranch,
  deleteTopicType,
  editBaseBranch,
  editTopicType,
  renameBaseBranch,
  renameTopicType,
  type BaseBranchInput,
  type TopicTypeInput,
} from "../../domain/config/editor.js";
import { writeConfigFile } from "../../infrastructure/config/loader.js";
import { ValidationError } from "../../domain/errors.js";
import type { MergeStrategy, UpdateStrategy, WorkflowConfig } from "../../domain/entities.js";
import { loadWorkflow, repositoryRoot, type GlobalOptions } from "../context.js";
import { print, renderTree, style, success } from "../output.js";

interface CliOptions {
  parent?: string;
  prefix?: string;
  startingPoint?: string;
  upstreamStrategy?: string;
  downstreamStrategy?: string;
  autoUpdate?: boolean;
  tag?: boolean;
  tagPrefix?: string;
  keep?: boolean;
}

function mergeStrategy(value: string | undefined, flag: string): MergeStrategy | undefined {
  if (value === undefined) return undefined;
  if (!["merge", "squash", "rebase"].includes(value)) {
    throw new ValidationError(`${flag} must be merge, squash or rebase`);
  }
  return value as MergeStrategy;
}

function updateStrategy(value: string | undefined, flag: string): UpdateStrategy | undefined {
  if (value === undefined) return undefined;
  if (!["merge", "rebase"].includes(value)) {
    throw new ValidationError(`${flag} must be merge or rebase`);
  }
  return value as UpdateStrategy;
}

function baseInput(options: CliOptions): BaseBranchInput {
  return {
    parent: options.parent,
    upstreamStrategy: mergeStrategy(options.upstreamStrategy, "--upstream-strategy"),
    downstreamStrategy: updateStrategy(options.downstreamStrategy, "--downstream-strategy"),
    autoUpdate: options.autoUpdate,
  };
}

function topicInput(options: CliOptions): TopicTypeInput {
  return {
    parent: options.parent,
    prefix: options.prefix,
    startPoint: options.startingPoint,
    upstreamStrategy: mergeStrategy(options.upstreamStrategy, "--upstream-strategy"),
    downstreamStrategy: updateStrategy(options.downstreamStrategy, "--downstream-strategy"),
    tag: options.tag,
    tagPrefix: options.tagPrefix,
    deleteOnFinish: options.keep === undefined ? undefined : !options.keep,
  };
}

function printConfig(config: WorkflowConfig, path: string): void {
  print(`${style.bold("Workflow")}  ${config.name}   ${style.dim(path)}`);
  print();
  print(style.bold("Base branches"));
  const roots = config.baseBranches.filter((b) => b.parent === undefined).map((b) => b.name);
  const lines = renderTree(
    roots,
    (name) => config.baseBranches.filter((b) => b.parent === name).map((b) => b.name),
    (name) => {
      const base = config.baseBranches.find((b) => b.name === name);
      if (base === undefined) return name;
      const details = [
        `upstream=${base.upstreamStrategy}`,
        `downstream=${base.downstreamStrategy}`,
        `auto-update=${String(base.autoUpdate)}`,
      ];
      return `${style.cyan(name)} ${style.dim(details.join(" "))}`;
    },
  );
  for (const line of lines) print(`  ${line}`);
  print();
  print(style.bold("Topic types"));
  for (const topic of config.topicTypes) {
    const details = [
      `prefix=${topic.prefix}`,
      `parent=${topic.parent}`,
      `start=${topic.startPoint ?? topic.parent}`,
      `upstream=${topic.upstreamStrategy}`,
      `downstream=${topic.downstreamStrategy}`,
      `tag=${String(topic.tag)}`,
      `delete-on-finish=${String(topic.deleteOnFinish)}`,
    ];
    print(`  ${style.cyan(topic.name)} ${style.dim(details.join(" "))}`);
  }
}

export function registerConfig(program: Command, globals: () => GlobalOptions): void {
  const config = program.command("config").description("inspect and edit the workflow definition");

  const withConfig = async (mutate: (current: WorkflowConfig) => WorkflowConfig): Promise<void> => {
    const options = globals();
    const root = await repositoryRoot(options.cwd ?? process.cwd());
    const loaded = loadWorkflow(root, options);
    const next = mutate(loaded.config);
    writeConfigFile(loaded.path, next);
    success(`updated ${loaded.path}`);
  };

  config
    .command("list")
    .description("show the current workflow definition")
    .action(async () => {
      const options = globals();
      const root = await repositoryRoot(options.cwd ?? process.cwd());
      const loaded = loadWorkflow(root, options);
      printConfig(loaded.config, loaded.path);
    });

  const strategyOptions = (command: Command): Command =>
    command
      .option("--upstream-strategy <strategy>", "merge strategy towards the parent")
      .option("--downstream-strategy <strategy>", "strategy when updating from the parent");

  strategyOptions(
    config
      .command("add")
      .description("add a base branch or topic type")
      .argument("<kind>", "base or topic")
      .argument("<name>", "branch or topic type name")
      .argument("[parent]", "parent base branch"),
  )
    .option("--prefix <prefix>", "topic branch prefix")
    .option("--starting-point <branch>", "branch new topics are created from")
    .option("--auto-update", "update this base branch when its parent changes")
    .option("--tag", "create a tag when a topic of this type is finished")
    .option("--tag-prefix <prefix>", "tag prefix for this topic type")
    .option("--keep", "keep topic branches after finishing")
    .action(async (kind: string, name: string, parent: string | undefined, options: CliOptions) => {
      await withConfig((current) => {
        if (kind === "base") {
          return addBaseBranch(current, name, {
            ...baseInput(options),
            parent: parent ?? options.parent,
          });
        }
        if (kind === "topic") {
          const topicParent = parent ?? options.parent;
          if (topicParent === undefined) {
            throw new ValidationError("a topic type needs a parent base branch");
          }
          return addTopicType(current, name, topicParent, topicInput(options));
        }
        throw new ValidationError(`unknown kind "${kind}"`, "use base or topic");
      });
    });

  strategyOptions(
    config
      .command("edit")
      .description("edit a base branch or topic type")
      .argument("<kind>", "base or topic")
      .argument("<name>", "branch or topic type name"),
  )
    .option("--parent <branch>", "parent base branch")
    .option("--prefix <prefix>", "topic branch prefix")
    .option("--starting-point <branch>", "branch new topics are created from")
    .option("--auto-update", "update this base branch when its parent changes")
    .option("--no-auto-update", "do not update this base branch automatically")
    .option("--tag", "create a tag when a topic of this type is finished")
    .option("--no-tag", "never create a tag for this topic type")
    .option("--tag-prefix <prefix>", "tag prefix for this topic type")
    .option("--keep", "keep topic branches after finishing")
    .option("--no-keep", "delete topic branches after finishing")
    .action(async (kind: string, name: string, options: CliOptions) => {
      await withConfig((current) => {
        if (kind === "base") return editBaseBranch(current, name, baseInput(options));
        if (kind === "topic") return editTopicType(current, name, topicInput(options));
        throw new ValidationError(`unknown kind "${kind}"`, "use base or topic");
      });
    });

  config
    .command("rename")
    .description("rename a base branch or topic type")
    .argument("<kind>", "base or topic")
    .argument("<from>", "current name")
    .argument("<to>", "new name")
    .action(async (kind: string, from: string, to: string) => {
      await withConfig((current) => {
        if (kind === "base") return renameBaseBranch(current, from, to);
        if (kind === "topic") return renameTopicType(current, from, to);
        throw new ValidationError(`unknown kind "${kind}"`, "use base or topic");
      });
    });

  config
    .command("delete")
    .description("remove a base branch or topic type from the definition")
    .argument("<kind>", "base or topic")
    .argument("<name>", "branch or topic type name")
    .action(async (kind: string, name: string) => {
      await withConfig((current) => {
        if (kind === "base") return deleteBaseBranch(current, name);
        if (kind === "topic") return deleteTopicType(current, name);
        throw new ValidationError(`unknown kind "${kind}"`, "use base or topic");
      });
    });
}
