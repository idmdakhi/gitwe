import { Command } from "commander";
import { VERSION } from "../version.js";
import { preScanGlobals } from "./args.js";
import { GLOBAL_OPTION_FLAGS, GlobalOptions } from "./options.js";
import { exitCodeFor, reportError } from "./error-reporter.js";

// دستورات پایه
import { registerInit } from "./commands/init.js";
import { registerConfig } from "./commands/config.js";
import { registerStatus } from "./commands/status.js";
import { registerDoctor } from "./commands/doctor.js";
import { registerValidate } from "./commands/validate.js";
import { registerVersion } from "./commands/version.js";

// دستورات اصلی شاخه‌ها
import { registerStart } from "./commands/start.js";
import { registerFinish } from "./commands/finish.js";
import { registerUpdate } from "./commands/update.js";
import { registerRebase } from "./commands/rebase.js";
import { registerDelete } from "./commands/delete.js";
import { registerRename } from "./commands/rename.js";
import { registerPush } from "./commands/push.js";
import { registerCheckout } from "./commands/checkout.js";
import { registerTrack } from "./commands/track.js";
import { registerCurrent } from "./commands/current.js";
import { registerList } from "./commands/list.js";
import { registerGraph } from "./commands/graph.js";

// دستورات کمکی و پیشرفته
import { registerAbort } from "./commands/abort.js";
import { registerClean } from "./commands/clean.js";
// import { registerCommitLint } from "./commands/commit-lint.js";
// import { registerLog } from "./commands/log.js";
// import { registerModules } from "./commands/modules.js";
import { registerPull } from "./commands/pull.js";
import { registerSync } from "./commands/sync.js";
import { registerTag } from "./commands/tag.js";
import { registerTypes } from "./commands/types.js";
// import { registerVersionBump } from "./commands/version-bump.js";

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

  // ========== ۱. دستورات پایه ==========
  registerInit(program, globalOptions);
  registerConfig(program, globalOptions);
  registerStatus(program, globalOptions);
  registerDoctor(program, globalOptions);
  registerValidate(program, globalOptions);
  registerVersion(program, globalOptions);

  // ========== ۲. دستورات اصلی شاخه‌ها ==========
  registerStart(program, globalOptions);
  registerFinish(program, globalOptions);
  registerUpdate(program, globalOptions);
  registerRebase(program, globalOptions);
  registerDelete(program, globalOptions);
  registerRename(program, globalOptions);
  registerPush(program, globalOptions);
  registerCheckout(program, globalOptions);
  registerTrack(program, globalOptions);
  registerCurrent(program, globalOptions);
  registerList(program, globalOptions);
  registerGraph(program, globalOptions);

  // ========== ۳. دستورات کمکی و پیشرفته ==========
  registerAbort(program, globalOptions);
  registerClean(program, globalOptions);
  // registerCommitLint(program, globalOptions);
  // registerLog(program, globalOptions);
  // registerModules(program, globalOptions);
  registerPull(program, globalOptions);
  registerSync(program, globalOptions);
  registerTag(program, globalOptions);
  registerTypes(program, globalOptions);
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
    const program = await buildProgram(argv.slice(2));
    await program.parseAsync(argv);
    return 0;
  } catch (error) {
    reportError(error);
    return exitCodeFor(error);
  }
}
