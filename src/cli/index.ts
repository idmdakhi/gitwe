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
import { registerPullCommand } from "#gitwe/cli/commands/pull";
import { registerPushCommand } from "#gitwe/cli/commands/push";
import { registerCheckoutCommand } from "#gitwe/cli/commands/checkout";
import { registerDeleteCommand } from "#gitwe/cli/commands/deleteBranch";
import { registerLogCommand } from "#gitwe/cli/commands/log";
import { registerAbortCommand } from "#gitwe/cli/commands/abort";
import { registerCleanCommand } from "#gitwe/cli/commands/clean";
import { registerInitCommand } from "#gitwe/cli/commands/init";
import { registerCommitLintCommand } from "#gitwe/cli/commands/commitLint";
import { registerModulesCommand } from "#gitwe/cli/commands/modules";
import { registerUpdateCommand } from "#gitwe/cli/commands/update";
import { registerSyncCommand } from "#gitwe/cli/commands/sync";
import { registerVersionCommand } from "#gitwe/cli/commands/version";
import { registerVersionBumpCommand } from "#gitwe/cli/commands/version-bump";
import { registerTagCommand } from "#gitwe/cli/commands/tag";
import { registerProjectConfigCommand } from "#gitwe/cli/commands/projectConfig";

import { UpdateChecker } from "#gitwe/infrastructure/update/Updatechecker";

const CURRENT_VERSION = "2.1.0";

const program = new Command();
program
  .name("gitwe")
  .description(
    "A pluggable, DDD-structured git workflow engine — git-flow is just one example workflow.",
  )
  .version(CURRENT_VERSION)
  .option("-c, --config <path>", "path to a JSON/YAML workflow config file")
  .option(
    "-w, --workflow <name>",
    "built-in workflow to use (git-flow | github-flow | trunk-based)",
  )
  .option(
    "-C, --cwd <path>",
    "run as if gitwe was started in <path> instead of the current directory",
  )
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

// All commands must be registered BEFORE program.parseAsync() runs below —
// commander resolves argv against whatever is registered at parse time.
registerInitCommand(program);
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
registerCommitLintCommand(program, getContainer, getJson);
registerModulesCommand(program, getContainer, getJson);
registerUpdateCommand(program, getContainer, getJson);
registerSyncCommand(program, getContainer, getJson);
registerVersionCommand(program, getContainer, getJson);
registerVersionBumpCommand(program, getContainer, getJson);
registerTagCommand(program, getContainer, getJson);
registerProjectConfigCommand(program, getContainer, getJson);

async function main(): Promise<void> {
  // Kicked off alongside command execution (not before it) so the registry
  // lookup's latency never delays the command itself.
  const updateCheck = new UpdateChecker().check(CURRENT_VERSION).catch(() => null);

  await program.parseAsync(process.argv);

  const opts = program.opts<GlobalOpts>();
  if (!opts.json && !opts.quiet) {
    const result = await updateCheck;
    if (result?.isOutdated) {
      console.error(
        `\n📦 نسخه‌ی جدیدی از gitwe موجوده: ${result.currentVersion} → ${result.latestVersion}\n` +
          `   برای به‌روزرسانی: npm install -g gitwe@latest\n`,
      );
    }
  }
}

main();
