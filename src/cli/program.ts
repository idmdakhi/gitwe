import { Command } from "commander";
import { Container } from "#gitwe/cli/container";
import { registerInitCommand } from "#gitwe/cli/commands/init";
import { registerConfigCommands } from "#gitwe/cli/commands/config";
import { registerTopicCommands } from "#gitwe/cli/commands/topic";
import { registerShorthandCommands } from "#gitwe/cli/commands/shorthand";
import { registerStatusCommand } from "#gitwe/cli/commands/status";
import { readPackageVersion } from "#gitwe/cli/version";

/**
 * Builds the full `gitwe` commander program for the repository at `cwd`.
 *
 * The per-branch-type commands (`gitwe feature start`, etc.) and the
 * current-branch shorthands (`gitwe finish`, etc.) are only registered
 * when a workflow configuration already exists — a fresh repository only
 * exposes `init` and `config`, plus a friendly hint.
 *
 * @public
 */
export async function buildProgram(cwd: string = process.cwd()): Promise<Command> {
  const program = new Command();
  program
    .name("gitwe")
    .description("A configurable git branching-workflow engine (Gitflow, GitHub Flow, GitLab Flow, or custom)")
    .version(readPackageVersion());

  const container = new Container(cwd);

  registerInitCommand(program, container);
  registerConfigCommands(program, container);

  const configured = await container.configStore.exists();
  if (configured) {
    const handlers = await container.forWorkflow();
    registerTopicCommands(program, handlers, container.git);
    registerShorthandCommands(program, handlers, container.git);
    registerStatusCommand(program, handlers);
  } else {
    program.addHelpText(
      "after",
      "\nNo workflow configured yet in this repository. Run `gitwe init` to get started.",
    );
  }

  return program;
}
