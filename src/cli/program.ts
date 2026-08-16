#!/usr/bin/env node
/**
 * gitwe CLI entry — single command tree, no parallel register* / *.ts duals.
 * Every command uses loadEngine + action from ./commands/shared.js and the
 * application Engine facade (no infrastructure imports in command files
 * except init's composition-root call to Engine.init).
 */
import { Command } from "commander";
import { version } from "../version.js";
import { setColorEnabled } from "./output.js";

import { initCommand } from "./commands/init.command.js";
import { startCommand } from "./commands/start.command.js";
import { finishCommand } from "./commands/finish.command.js";
import { updateCommand } from "./commands/update.command.js";
import { publishCommand } from "./commands/publish.command.js";
import { deleteCommand } from "./commands/delete.command.js";
import { listCommand } from "./commands/list.command.js";
import { overviewCommand } from "./commands/overview.command.js";
import { validateCommand } from "./commands/validate.command.js";
import { versionCommand } from "./commands/version.command.js";
import { typesCommand } from "./commands/types.command.js";
import { currentCommand } from "./commands/current.command.js";
import { doctorCommand } from "./commands/doctor.command.js";
import { checkoutCommand } from "./commands/checkout.command.js";
import { cleanCommand } from "./commands/clean.command.js";
import { pullCommand } from "./commands/pull.command.js";
import { renameCommand } from "./commands/rename.command.js";
import { syncCommand } from "./commands/sync.command.js";
import { trackCommand } from "./commands/track.command.js";
import { tagCommand } from "./commands/tag.command.js";
import { abortCommand } from "./commands/abort.command.js";
import { logCommand } from "./commands/log.command.js";
import { graphCommand } from "./commands/graph.command.js";
import { rebaseCommand } from "./commands/rebase.command.js";
import { configCommand } from "./commands/config.command.js";

export async function buildProgram(): Promise<Command> {
  const program = new Command("gitwe")
    .description("A configurable git branching-workflow engine")
    .version(version)
    .option("--cwd <path>", "run as if gitwe was started in <path>", process.cwd())
    .option("-C, --config <path>", "explicit path to the workflow definition file")
    .option("--no-color", "disable coloured output")
    .option("-v, --verbose", "verbose logging", false)
    .option("--dry-run", "simulate without making changes (where supported)", false)
    .option("--format <format>", "output format: text | json | yaml", "text");

  program.hook("preAction", (thisCommand) => {
    const opts = thisCommand.opts<{ color?: boolean }>();
    // Commander sets color=false when --no-color is passed
    if (opts.color === false) setColorEnabled(false);
  });

  program.addCommand(initCommand());
  program.addCommand(startCommand());
  program.addCommand(finishCommand());
  program.addCommand(updateCommand());
  program.addCommand(syncCommand());
  program.addCommand(publishCommand());
  program.addCommand(deleteCommand());
  program.addCommand(currentCommand());
  program.addCommand(listCommand());
  program.addCommand(checkoutCommand());
  program.addCommand(overviewCommand());
  program.addCommand(validateCommand());
  program.addCommand(versionCommand());
  program.addCommand(typesCommand());
  program.addCommand(doctorCommand());
  program.addCommand(cleanCommand());
  program.addCommand(pullCommand());
  program.addCommand(renameCommand());
  program.addCommand(trackCommand());
  program.addCommand(tagCommand());
  program.addCommand(abortCommand());
  program.addCommand(logCommand());
  program.addCommand(graphCommand());
  program.addCommand(rebaseCommand());
  program.addCommand(configCommand());

  return program;
}

export async function run(argv: string[] = process.argv): Promise<0 | 1> {
  try {
    const program = await buildProgram();
    await program.parseAsync(argv);
    return 0;
  } catch (error) {
    // If the error is already handled by the action() wrapper, it will have set process.exitCode.
    // For unhandled errors, we set exit code 1 and print a generic message.
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(`Unexpected error: ${String(error)}`);
    }
    return 1;
  }
}
