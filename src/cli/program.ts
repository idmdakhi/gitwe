import { Command } from "commander";

import { ConflictError, GitweError } from "../domain/errors.js";
import { VERSION } from "../version.js";
import { registerConfig } from "./commands/config.js";
import { registerInit } from "./commands/init.js";
import { registerOverview } from "./commands/overview.js";
import { registerTopicCommands } from "./commands/topic.js";
import { repositoryRoot, tryLoadWorkflow, type GlobalOptions } from "./context.js";
import { print, setColorEnabled, style } from "./output.js";

/**
 * Topic commands are generated from the workflow definition, so the global
 * options have to be read before commander parses the rest of the arguments.
 */
function preScanGlobals(argv: string[]): GlobalOptions {
  const options: GlobalOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config" || arg === "-C") options.config = argv[i + 1];
    else if (arg.startsWith("--config=")) options.config = arg.slice("--config=".length);
    else if (arg === "--cwd") options.cwd = argv[i + 1];
    else if (arg.startsWith("--cwd=")) options.cwd = arg.slice("--cwd=".length);
    else if (arg === "--verbose" || arg === "-v") options.verbose = true;
    else if (arg === "--no-color") setColorEnabled(false);
  }
  return options;
}

export async function buildProgram(argv: string[]): Promise<Command> {
  const globals = preScanGlobals(argv);

  const program = new Command();
  program
    .name("gitwe")
    .description("gitwe — a configurable git workflow engine")
    .version(VERSION, "--version", "show the gitwe version")
    .option("-C, --config <path>", "path to the workflow definition")
    .option("--cwd <path>", "run as if gitwe was started in <path>")
    .option("-v, --verbose", "show every git command gitwe runs")
    .option("--no-color", "disable coloured output")
    .showHelpAfterError()
    .enablePositionalOptions();

  const globalOptions = (): GlobalOptions => ({ ...globals, ...program.opts<GlobalOptions>() });

  registerInit(program, globalOptions);
  registerConfig(program, globalOptions);
  registerOverview(program, globalOptions);
  program
    .command("version")
    .description("show the gitwe version")
    .action(() => print(VERSION));

  try {
    const root = await repositoryRoot(globals.cwd ?? process.cwd());
    const loaded = tryLoadWorkflow(root, globals);
    if (loaded !== undefined) registerTopicCommands(program, loaded.config, globalOptions);
  } catch {
    // Outside a repository only init/config/version are available.
  }

  acceptGlobalOptionsEverywhere(program);
  return program;
}

/**
 * The global options are read by {@link preScanGlobals} from the raw argv, so
 * every leaf command accepts (and ignores) them wherever the user types them.
 */
function acceptGlobalOptionsEverywhere(command: Command): void {
  for (const child of command.commands) {
    if (child.commands.length > 0) {
      acceptGlobalOptionsEverywhere(child);
      continue;
    }
    child
      .option("-C, --config <path>", "path to the workflow definition")
      .option("--cwd <path>", "run as if gitwe was started in <path>")
      .option("-v, --verbose", "show every git command gitwe runs")
      .option("--no-color", "disable coloured output");
  }
}

function reportError(error: unknown): void {
  if (error instanceof ConflictError) {
    process.stderr.write(`${style.red("conflict:")} ${error.message}\n`);
    for (const file of error.files) process.stderr.write(`  ${file}\n`);
    if (error.hint !== undefined) process.stderr.write(`${style.dim(error.hint)}\n`);
    return;
  }
  if (error instanceof GitweError) {
    process.stderr.write(`${style.red("error:")} ${error.message}\n`);
    if (error.hint !== undefined) process.stderr.write(`${style.dim(error.hint)}\n`);
    return;
  }
  process.stderr.write(`${style.red("error:")} ${(error as Error).message}\n`);
}

export async function run(argv: string[] = process.argv): Promise<number> {
  try {
    const program = await buildProgram(argv.slice(2));
    await program.parseAsync(argv);
    return 0;
  } catch (error) {
    reportError(error);
    return error instanceof ConflictError ? 2 : 1;
  }
}
