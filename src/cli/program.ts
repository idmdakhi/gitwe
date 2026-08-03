import { Command } from "commander";
import { VERSION } from "../version.js";
import { preScanGlobals } from "./args.js";
import { registerInit } from "./commands/init.js";
import { registerConfig } from "./commands/config.js";
import { registerOverview } from "./commands/overview.js";
import { registerWorkflowCommands } from "./commands/workflow.js";
import { registerCheckout } from "./commands/checkout.js";
import { registerTrack } from "./commands/track.js";
import { registerCurrent } from "./commands/current.js";
import { registerList } from "./commands/list.js";
import { registerGraph } from "./commands/graph.js";
import { registerDoctor } from "./commands/doctor.js";
import { registerValidate } from "./commands/validate.js";
// import { registerTopicCommands } from "./commands/topic.js";
// import { repositoryRoot, tryLoadWorkflow } from "./context.js";
import { exitCodeFor, reportError } from "./error-reporter.js";
import { GLOBAL_OPTION_FLAGS, GlobalOptions } from "./options.js";
import { print, printStructured } from "./output.js";

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
  // ثبت دستورات
  registerInit(program, globalOptions);
  registerConfig(program, globalOptions);
  registerOverview(program, globalOptions);
  registerWorkflowCommands(program, globalOptions);
  registerCheckout(program, globalOptions);
  registerTrack(program, globalOptions);
  registerCurrent(program, globalOptions);
  registerList(program, globalOptions);
  registerGraph(program, globalOptions);
  registerDoctor(program, globalOptions);
  registerValidate(program, globalOptions);

  program
    .command("version")
    .description("show the gitwe version")
    .action(() => {
      const format = globalOptions().format;
      const data = { version: VERSION, schemaVersion: 1 };
      if (format === "json" || format === "yaml") {
        printStructured(data, format!);
      } else {
        print(VERSION);
      }
    });

  // Register per-topic command groups when a workflow config is available
  // try {
  //   const root = await repositoryRoot(globals.cwd ?? process.cwd());
  //   const loaded = tryLoadWorkflow(root, globals);
  //   if (loaded !== undefined) {
  //     registerTopicCommands(program, loaded.config, globalOptions);
  //   }
  // } catch {
  //   // Outside a repository only init / version / help are available.
  // }

  acceptGlobalOptionsEverywhere(program);
  return program;
}

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
