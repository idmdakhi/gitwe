import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";

export function registerValidateCommand(program: Command, getContainer: () => Container): void {
  program
    .command("validate <configPath>")
    .description("Validate a workflow config file (JSON or YAML) without touching the repo")
    .action((configPath: string) => {
      const container = getContainer();
      const result = container.validateWorkflowHandler.handle(configPath);
      if (result.valid) {
        console.log(
          `✅ "${result.workflowName}" is valid (${result.branchTypeCount} branch type(s)).`,
        );
      } else {
        console.error(`❌ Invalid workflow config: ${result.error}`);
        process.exitCode = 1;
      }
    });
}
