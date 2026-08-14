import { Command } from "commander";
import { getVersion } from "../version.js";
import { expandCliAliases, preScanGlobals, resolveCliAliases } from "./args.js";
import { GLOBAL_OPTION_FLAGS, GlobalOptions } from "./options.js";
import { exitCodeFor, reportError } from "./error-reporter.js";

// دستورات پایه
import { registerInitCommand } from "./commands/init.js";
import { registerConfigCommand } from "./commands/config.js";
import { registerStatusCommand } from "./commands/status.js";
import { registerDoctorCommand } from "./commands/doctor.js";
import { registerValidateCommand } from "./commands/validate.js";
import { registerVersionCommand } from "./commands/version.js";

// دستورات اصلی شاخه‌ها
import { registerStartCommand } from "./commands/start.js";
import { registerFinishCommand } from "./commands/finish.js";
import { registerUpdateCommand } from "./commands/update.js";
import { registerRebaseCommand } from "./commands/rebase.js";
import { registerDeleteCommand } from "./commands/delete.js";
import { registerRenameCommand } from "./commands/rename.js";
import { registerPushCommand } from "./commands/push.js";
import { registerCheckoutCommand } from "./commands/checkout.js";
import { registerTrackCommand } from "./commands/track.js";
import { registerCurrentCommand } from "./commands/current.js";
import { registerListCommand } from "./commands/list.js";
import { registerGraphCommand } from "./commands/graph.js";

// دستورات کمکی و پیشرفته
import { registerAbortCommand } from "./commands/abort.js";
import { registerCleanCommand } from "./commands/clean.js";
// import { registerCommitLintCommand } from "./commands/commit-lint.js";
// import { registerLogCommand } from "./commands/log.js";
// import { registerModulesCommand } from "./commands/modules.js";
import { registerPullCommand } from "./commands/pull.js";
import { registerSyncCommand } from "./commands/sync.js";
import { registerTagCommand } from "./commands/tag.js";
import { registerTypesCommand } from "./commands/types.js";
import { createEngine } from "./context.js";
import { Engine } from "../application/engine.js";
// import { registerVersionBump } from "./commands/version-bump.js";

export async function buildProgram(argv: string[]): Promise<Command> {
  const globals = preScanGlobals(argv);
  const program = new Command();
  program
    .name("gitwe")
    .description("gitwe — a configurable git workflow engine")
    .version(getVersion(), "--version", "show the gitwe version")
    .showHelpAfterError()
    .enablePositionalOptions();

  for (const opt of GLOBAL_OPTION_FLAGS) {
    program.option(opt.flags, opt.description);
  }
  const globalOptions = (): GlobalOptions => ({ ...globals, ...program.opts<GlobalOptions>() });

  const getEngine = async (): Promise<Engine> => {
    return createEngine(globalOptions());
  };
  // ========== ۱. دستورات پایه ==========
  registerInitCommand(program, globalOptions);
  registerConfigCommand(program, globalOptions);
  registerStatusCommand(program, globalOptions);
  registerDoctorCommand(program, getEngine);
  registerValidateCommand(program, globalOptions);
  registerVersionCommand(program, getVersion);

  // ========== ۲. دستورات اصلی شاخه‌ها ==========
  registerStartCommand(program, globalOptions);
  registerFinishCommand(program, globalOptions);
  registerUpdateCommand(program, globalOptions);
  registerRebaseCommand(program, globalOptions);
  registerDeleteCommand(program, globalOptions);
  registerRenameCommand(program, globalOptions);
  registerPushCommand(program, globalOptions);
  registerCheckoutCommand(program, globalOptions);
  registerTrackCommand(program, globalOptions);
  registerCurrentCommand(program, globalOptions);
  registerListCommand(program, globalOptions);
  registerGraphCommand(program, globalOptions);

  // ========== ۳. دستورات کمکی و پیشرفته ==========
  registerAbortCommand(program, globalOptions);
  registerCleanCommand(program, globalOptions);
  // registerCommitLintCommand(program, globalOptions);
  // registerLogCommand(program, globalOptions);
  // registerModulesCommand(program, globalOptions);
  registerPullCommand(program, globalOptions);
  registerSyncCommand(program, globalOptions);
  registerTagCommand(program, globalOptions);
  registerTypesCommand(program, globalOptions);
  // registerVersionBump(program, globalOptions);

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
    const globals = preScanGlobals(argv);
    argv = resolveCliAliases(argv, globals);
    const program = await buildProgram(argv.slice(2));
    await program.parseAsync(argv);
    return 0;
  } catch (error) {
    reportError(error);
    return exitCodeFor(error);
  }
}
