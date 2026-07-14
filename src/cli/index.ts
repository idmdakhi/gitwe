#!/usr/bin/env node
import { Command } from "commander";
import { ShellGitAdapter } from "../adapters/ShellGitAdapter";
import { WorkflowEngine } from "../core/WorkflowEngine";
import { gitFlowDefinition } from "../core/WorkflowDefinition";
import { ConsoleLogger } from "../logging/Logger";
import { GitflowError } from "../core/errors";

const logger = new ConsoleLogger();
const engine = new WorkflowEngine(
  new ShellGitAdapter(process.cwd(), logger),
  gitFlowDefinition,
  logger,
);

const program = new Command();

program
  .name("gwe")
  .description("gitflow-engine — a rule-based git branching workflow CLI")
  .version("0.1.0");

program
  .command("current")
  .description("Print the current branch")
  .action(async () => {
    console.log(await engine.currentBranch());
  });

program
  .command("list")
  .description("List local branches")
  .action(async () => {
    const branches = await engine.listBranches();
    for (const b of branches) {
      console.log(`${b.isCurrent ? "*" : " "} ${b.name}`);
    }
  });

program
  .command("types")
  .description("List branch types defined by the current workflow")
  .action(() => {
    for (const t of engine.listBranchTypes()) {
      console.log(t);
    }
  });

program
  .command("start <type> <name>")
  .description("Start a new branch of a given type (e.g. gwe start feature login)")
  .action(async (type: string, name: string) => {
    const fullName = await engine.start(type, name);
    console.log(`Created and checked out "${fullName}"`);
  });

program
  .command("finish <branch>")
  .description("Merge a branch into its configured targets and delete it")
  .option("--keep", "keep the branch after merging instead of deleting it")
  .action(async (branch: string, opts: { keep?: boolean }) => {
    const result = await engine.finish(branch, { deleteAfterMerge: !opts.keep });
    for (const m of result.merges) {
      console.log(`Merged "${m.source}" into "${m.target}"`);
    }
    if (result.deleted) {
      console.log(`Deleted "${branch}"`);
    }
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  if (err instanceof GitflowError) {
    console.error(`Error [${err.code}]: ${err.message}`);
  } else {
    console.error(`Unexpected error: ${(err as Error).message}`);
  }
  process.exitCode = 1;
});
