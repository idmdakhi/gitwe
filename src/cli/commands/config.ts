import { Command } from "commander";
import type { GlobalOptions } from "../options.js";

import {
  addBaseBranch,
  addBranchType,
  deleteBaseBranch,
  deleteBranchType,
  editBaseBranch,
  editBranchType,
  renameBaseBranch,
  renameBranchType,
  type BaseBranchInput,
  type BranchTypeInput,
} from "../../domain/config/editor.js";
import { writeConfigFile } from "../../infrastructure/config/loader.js";
import { ValidationError } from "../../domain/errors.js";
import type { WorkflowConfig } from "../../domain/entities.js";
import { loadWorkflow, repositoryRoot } from "../context.js";
import { print, renderTree, style, success } from "../output.js";

interface CliOptions {
  parent?: string;
  base?: string;
  target?: string;
  prefix?: string;
  aliases?: string;
  tag?: boolean;
  tagPrefix?: string;
  keep?: boolean;
  protected?: boolean;
}

function baseInput(options: CliOptions): BaseBranchInput {
  return {
    base: options.base,
  };
}

function branchTypeInput(options: CliOptions): BranchTypeInput {
  return {
    base: options.base,
    target: options.target,
    prefix: options.prefix,
    aliases: options.aliases,
  };
}

function printConfig(config: WorkflowConfig, path: string): void {
  print(`${style.bold("Workflow")}  ${config.name}   ${style.dim(path)}`);
  print();

  // نمایش Base Branches
  print(style.bold("Base branches"));
  const roots = config.baseBranches.filter((b) => b.base === undefined).map((b) => b.name);
  const lines = renderTree(
    roots,
    (name) => config.baseBranches.filter((b) => b.base === name).map((b) => b.name),
    (name) => {
      const base = config.baseBranches.find((b) => b.name === name);
      if (base === undefined) return name;
      const parts = [];
      if (base.protected) parts.push(style.yellow("protected"));
      if (base.aliases?.length) parts.push(`aliases: ${base.aliases.join(", ")}`);
      return `${style.cyan(name)}${parts.length ? ` ${style.dim(`(${parts.join(", ")})`)}` : ""}`;
    },
  );
  for (const line of lines) print(`  ${line}`);
  print();

  // نمایش Branch Types
  print(style.bold("Branch types"));
  for (const bt of config.branchTypes) {
    const details: string[] = [
      `prefix=${bt.prefix}`,
      `base=${bt.base}`,
      `target=${bt.target.join(", ")}`,
    ];
    if (bt.aliases?.length) details.push(`aliases: ${bt.aliases.join(", ")}`);

    // استراتژی ادغام از merge.branchTypes
    const mergeStrategy = config.merge?.branchTypes?.[bt.name];
    if (mergeStrategy) {
      const strategy = Array.isArray(mergeStrategy) ? mergeStrategy.join(", ") : mergeStrategy;
      details.push(`merge=${strategy}`);
    }

    // تگ‌گذاری از versioning.tag
    const isTagged = config.versioning?.tag?.includes(bt.name) ?? false;
    details.push(`tag=${isTagged ? "yes" : "no"}`);

    // حذف بعد از finish از merge.deleteOnFinish
    const isDeleted = config.merge?.deleteOnFinish?.includes(bt.name) ?? false;
    details.push(`delete-on-finish=${isDeleted ? "yes" : "no"}`);

    print(`  ${style.cyan(bt.name)} ${style.dim(details.join(" "))}`);
  }
  print();

  // نمایش تنظیمات versioning
  if (config.versioning) {
    print(style.bold("Versioning"));
    print(`  tag prefix: ${config.versioning.tagPrefix}`);
    print(`  tagged types: ${config.versioning.tag.join(", ") || "none"}`);
    if (config.versioning.branchTypes) {
      const vt = config.versioning.branchTypes;
      const parts = [];
      if (vt.version?.length) parts.push(`version: ${vt.version.join(", ")}`);
      if (vt.major?.length) parts.push(`major: ${vt.major.join(", ")}`);
      if (vt.minor?.length) parts.push(`minor: ${vt.minor.join(", ")}`);
      if (vt.patch?.length) parts.push(`patch: ${vt.patch.join(", ")}`);
      if (parts.length) print(`  bump mapping: ${parts.join("; ")}`);
    }
    print();
  }

  // نمایش تنظیمات merge
  if (config.merge) {
    print(style.bold("Merge"));
    print(`  default strategy: ${config.merge.strategy}`);
    if (config.merge.branchTypes && Object.keys(config.merge.branchTypes).length) {
      print(
        `  per-type strategies: ${Object.entries(config.merge.branchTypes)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ")}`,
      );
    }
    if (config.merge.deleteOnFinish?.length) {
      print(`  delete on finish: ${config.merge.deleteOnFinish.join(", ")}`);
    }
    if (config.merge.squash?.enabled) {
      print(`  squash allowed: ${config.merge.squash.branchTypes.join(", ")}`);
    }
    print();
  }
}

export function registerConfigCommand(program: Command, globals: () => GlobalOptions): void {
  const configCmd = program
    .command("config")
    .description("inspect and edit the workflow definition");

  const withConfig = async (mutate: (current: WorkflowConfig) => WorkflowConfig): Promise<void> => {
    const options = globals();
    const root = await repositoryRoot(options.cwd ?? process.cwd());
    const loaded = loadWorkflow(root, options);
    const next = mutate(loaded.config);
    writeConfigFile(loaded.path, next);
    success(`updated ${loaded.path}`);
  };

  configCmd
    .command("list")
    .description("show the current workflow definition")
    .action(async () => {
      const options = globals();
      const root = await repositoryRoot(options.cwd ?? process.cwd());
      const loaded = loadWorkflow(root, options);
      printConfig(loaded.config, loaded.path);
    });

  // دستور add
  const addCmd = configCmd
    .command("add")
    .description("add a base branch or branch type")
    .argument("<kind>", "base or branchType")
    .argument("<name>", "branch or branch type name")
    .argument("[base]", "parent base branch for branch type, or base for base branch");

  addCmd
    .option("--prefix <prefix>", "branch prefix (for branch types)")
    .option("--target <target>", "target branch(es) (comma-separated for multiple)")
    .option("--aliases <aliases>", "comma-separated aliases")
    .option("--protected", "mark base branch as protected")
    .action(
      async (
        kind: string,
        name: string,
        base: string | undefined,
        options: CliOptions & { protected?: boolean },
      ) => {
        await withConfig((current) => {
          if (kind === "base") {
            return addBaseBranch(current, name, {
              base: options.base ?? base,
              protected: options.protected,
            });
          }
          if (kind === "branchType" || kind === "topic") {
            const branchBase = base ?? options.base;
            if (!branchBase) throw new ValidationError("a branch type needs a base branch");
            if (!options.target) throw new ValidationError("--target is required for branch types");

            // تبدیل target از رشته کاما جدا به آرایه
            const target = options.target
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);

            // تبدیل aliases از رشته کاما جدا به آرایه
            const aliases = options.aliases
              ?.split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            const prefix = options.prefix ?? `${name}/`;

            return addBranchType(current, name, branchBase, target, { prefix, aliases });
          }
          throw new ValidationError(`unknown kind "${kind}"`, "use base or branchType");
        });
      },
    );

  // دستور edit
  const editCmd = configCmd
    .command("edit")
    .description("edit a base branch or branch type")
    .argument("<kind>", "base or branchType")
    .argument("<name>", "branch or branch type name");

  editCmd
    .option("--base <branch>", "new base branch")
    .option("--prefix <prefix>", "new prefix (for branch types)")
    .option("--target <target>", "new target branch(es) (comma-separated)")
    .option("--aliases <aliases>", "new aliases (comma-separated)")
    .option("--protected", "set protected (for base branches)")
    .option("--no-protected", "remove protected")
    .action(async (kind: string, name: string, options: CliOptions & { protected?: boolean }) => {
      await withConfig((current) => {
        if (kind === "base") {
          return editBaseBranch(current, name, {
            base: options.base,
            protected: options.protected,
          });
        }
        if (kind === "branchType" || kind === "topic") {
          const target = options.target
            ? options.target
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined;

          const aliases = options.aliases
            ? options.aliases
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined;

          return editBranchType(current, name, {
            base: options.base,
            prefix: options.prefix,
            target,
            aliases,
          });
        }
        throw new ValidationError(`unknown kind "${kind}"`, "use base or branchType");
      });
    });

  // دستور rename
  configCmd
    .command("rename")
    .description("rename a base branch or branch type")
    .argument("<kind>", "base or branchType")
    .argument("<from>", "current name")
    .argument("<to>", "new name")
    .action(async (kind: string, from: string, to: string) => {
      await withConfig((current) => {
        if (kind === "base") return renameBaseBranch(current, from, to);
        if (kind === "branchType" || kind === "topic") return renameBranchType(current, from, to);
        throw new ValidationError(`unknown kind "${kind}"`, "use base or branchType");
      });
    });

  // دستور delete
  configCmd
    .command("delete")
    .description("remove a base branch or branch type from the definition")
    .argument("<kind>", "base or branchType")
    .argument("<name>", "branch or branch type name")
    .action(async (kind: string, name: string) => {
      await withConfig((current) => {
        if (kind === "base") return deleteBaseBranch(current, name);
        if (kind === "branchType" || kind === "topic") return deleteBranchType(current, name);
        throw new ValidationError(`unknown kind "${kind}"`, "use base or branchType");
      });
    });
}
