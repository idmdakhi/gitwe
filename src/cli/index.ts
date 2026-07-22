#!/usr/bin/env node
import { Command } from "commander";
import { Container } from "./container";

import { registerStartCommand } from "./commands/start";
import { registerFinishCommand } from "./commands/finish";
import { registerStatusCommand } from "./commands/status";
import { registerGraphCommand } from "./commands/graph";
import { registerCurrentCommand } from "./commands/current";
import { registerListCommand } from "./commands/list";
import { registerTypesCommand } from "./commands/types";
import { registerValidateCommand } from "./commands/validate";
import { registerDoctorCommand } from "./commands/doctor";
import { registerConfigCommand } from "./commands/config";
import { registerPullCommand } from "./commands/pull";
import { registerPushCommand } from "./commands/push";
import { registerCheckoutCommand } from "./commands/checkout";
import { registerDeleteCommand } from "./commands/deleteBranch";
import { registerLogCommand } from "./commands/log";
import { registerAbortCommand } from "./commands/abort";
import { registerCleanCommand } from "./commands/clean";
import { registerInitCommand } from "./commands/init";
import { registerCommitLintCommand } from "./commands/commitLint";

const program = new Command();

program
  .name("gitwe")
  .description("A pluggable, DDD-structured git workflow engine — git-flow is just one example workflow.")
  .version("2.1.0")
  .option("-c, --config <path>", "path to a JSON/YAML workflow config file")
  .option("-w, --workflow <name>", "built-in workflow to use (git-flow | github-flow | trunk-based)")
  .option("-C, --cwd <path>", "run as if gitwe was started in <path> instead of the current directory")
  .option("-q, --quiet", "suppress informational logging")
  .option("-j, --json", "print machine-readable JSON instead of human-readable text");

interface GlobalOpts {
  config?: string;
  workflow?: string;
  cwd?: string;
  quiet?: boolean;
  json?: boolean;
}

/** Built fresh per command invocation so each command sees up-to-date global options. */
function getContainer(): Container {
  const opts = program.opts<GlobalOpts>();
  // JSON mode implies quiet: informational logging would otherwise corrupt stdout for a parser.
  return new Container({
    configPath: opts.config,
    builtIn: opts.workflow,
    cwd: opts.cwd,
    quiet: opts.quiet || opts.json,
  });
}

function getJson(): boolean {
  return Boolean(program.opts<GlobalOpts>().json);
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
registerPullCommand(program, getContainer, getJson);
registerPushCommand(program, getContainer, getJson);
registerCheckoutCommand(program, getContainer, getJson);
registerDeleteCommand(program, getContainer, getJson);
registerLogCommand(program, getContainer, getJson);
registerAbortCommand(program, getContainer, getJson);
registerCleanCommand(program, getContainer, getJson);
registerInitCommand(program);
registerCommitLintCommand(program, getContainer, getJson);

program.parse(process.argv);
