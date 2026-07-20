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
  .option("-q, --quiet", "suppress informational logging")
  .option("-j, --json", "print machine-readable JSON instead of human-readable text");

/** Built fresh per command invocation so each command sees up-to-date global options. */
function getContainer(): Container {
  const opts = program.opts<{
    config?: string;
    workflow?: string;
    quiet?: boolean;
    json?: boolean;
  }>();
  // JSON mode implies quiet: informational logging would otherwise corrupt stdout for a parser.
  return new Container({
    configPath: opts.config,
    builtIn: opts.workflow,
    quiet: opts.quiet || opts.json,
  });
}

function getJson(): boolean {
  return Boolean(program.opts<{ json?: boolean }>().json);
}

registerStartCommand(program, getContainer, getJson);
registerFinishCommand(program, getContainer, getJson);
registerStatusCommand(program, getContainer, getJson);
registerGraphCommand(program, getContainer, getJson);
registerCurrentCommand(program, getContainer, getJson);
registerListCommand(program, getContainer, getJson);
registerTypesCommand(program, getContainer, getJson);
registerValidateCommand(program, getContainer, getJson);
registerDoctorCommand(program, getContainer, getJson);
registerConfigCommand(program, getContainer, getJson);

program.parse(process.argv);
