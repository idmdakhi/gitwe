#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.command.js";
import { startCommand } from "./commands/start.command.js";
import { finishCommand } from "./commands/finish.command.js";
import { updateCommand } from "./commands/update.command.js";
import { publishCommand } from "./commands/publish.command.js";
import { deleteCommand } from "./commands/delete.command.js";
import { listCommand } from "./commands/list.command.js";
import { overviewCommand } from "./commands/overview.command.js";
import { validateCommand } from "./commands/validate.command.js";
import { version } from "../version.js";

export function buildProgram(): Command {
  const program = new Command("gitwe")
    .description("A configurable git branching-workflow engine")
    .version(version)
    .option("--cwd <path>", "run as if gitwe was started in <path>", process.cwd())
    .option("--config <path>", "explicit path to the workflow definition file")
    .option("--no-color", "disable coloured output")
    .option("-v, --verbose", "verbose logging", false);

  program.addCommand(initCommand());
  program.addCommand(startCommand());
  program.addCommand(finishCommand());
  program.addCommand(updateCommand());
  program.addCommand(publishCommand());
  program.addCommand(deleteCommand());
  program.addCommand(listCommand());
  program.addCommand(overviewCommand());
  program.addCommand(validateCommand());

  return program;
}

buildProgram().parseAsync(process.argv);
