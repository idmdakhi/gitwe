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
  const format = globalOptions().format;

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
      const data = { version: VERSION, schemaVersion: 1 };
      if (format === "json" || format === "yaml") {
        printStructured(data, format!);
      } else {
        print(VERSION);
      }
    });

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
