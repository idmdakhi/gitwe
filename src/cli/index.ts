#!/usr/bin/env node
import { Command } from "commander";
import { Container } from "#gitwe/cli/container";

import { registerStartCommand } from "#gitwe/cli/commands/start";
import { registerFinishCommand } from "#gitwe/cli/commands/finish";
import { registerStatusCommand } from "#gitwe/cli/commands/status";
import { registerGraphCommand } from "#gitwe/cli/commands/graph";
import { registerCurrentCommand } from "#gitwe/cli/commands/current";
import { registerListCommand } from "#gitwe/cli/commands/list";
import { registerTypesCommand } from "#gitwe/cli/commands/types";
import { registerValidateCommand } from "#gitwe/cli/commands/validate";
import { registerDoctorCommand } from "#gitwe/cli/commands/doctor";
import { registerConfigCommand } from "#gitwe/cli/commands/config";

const program = new Command();

program
  .name("gitwe")
  .description(
    "A pluggable, DDD-structured git workflow engine — git-flow is just one example workflow.",
  )
  .version("2.0.0")
  .option("-c, --config <path>", "path to a JSON/YAML workflow config file")
  .option(
    "-w, --workflow <name>",
    "built-in workflow to use (git-flow | github-flow | trunk-based)",
  )
  .option("-q, --quiet", "suppress informational logging");

/** Built fresh per command invocation so each command sees up-to-date global options. */
function getContainer(): Container {
  const opts = program.opts<{ config?: string; workflow?: string; quiet?: boolean }>();
  return new Container({ configPath: opts.config, builtIn: opts.workflow, quiet: opts.quiet });
}

registerStartCommand(program, getContainer);
registerFinishCommand(program, getContainer);
registerStatusCommand(program, getContainer);
registerGraphCommand(program, getContainer);
registerCurrentCommand(program, getContainer);
registerListCommand(program, getContainer);
registerTypesCommand(program, getContainer);
registerValidateCommand(program, getContainer);
registerDoctorCommand(program, getContainer);
registerConfigCommand(program, getContainer);

program.parse(process.argv);
