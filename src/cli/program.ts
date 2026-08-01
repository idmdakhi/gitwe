import { Command } from "commander";

import { VERSION } from "../version.js";
import { preScanGlobals } from "./args.js";
import { registerConfig } from "./commands/config.js";
import { registerInit } from "./commands/init.js";
import { registerOverview } from "./commands/overview.js";
import { registerTopicCommands } from "./commands/topic.js";
import { repositoryRoot, tryLoadWorkflow, type GlobalOptions } from "./context.js";
import { exitCodeFor, reportError } from "./error-reporter.js";
import { GLOBAL_OPTION_FLAGS } from "./options.js";
import { print } from "./output.js";

export async function buildProgram(argv: string[]): Promise<Command> {
  const globals = preScanGlobals(argv);

  const program = new Command();
  program
    .name("gitwe")
    .description("gitwe — a configurable git workflow engine")
    .version(VERSION, "--version", "show the gitwe version")
    .showHelpAfterError()
    .enablePositionalOptions();

  for (const opt of GLOBAL_OPTION_FLAGS) {
    program.option(opt.flags, opt.description);
  }

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
 * Global options are read by {@link preScanGlobals} from the raw argv, so
 * every leaf command accepts (and ignores) them wherever the user types them.
 */
function acceptGlobalOptionsEverywhere(command: Command): void {
  for (const child of command.commands) {
    if (child.commands.length > 0) {
      acceptGlobalOptionsEverywhere(child);
      continue;
    }
    for (const opt of GLOBAL_OPTION_FLAGS) {
      child.option(opt.flags, opt.description);
    }
  }
}

export async function run(argv: string[] = process.argv): Promise<number> {
  try {
    const program = await buildProgram(argv.slice(2));
    await program.parseAsync(argv);
    return 0;
  } catch (error) {
    reportError(error);
    return exitCodeFor(error);
  }
}
