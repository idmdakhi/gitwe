import type { Command } from "commander";
import type { Container } from "../container";
import { printResult } from "../output";

export function registerValidateCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("validate <configPath>")
    .description("Validate a workflow config file (JSON or YAML) without touching the repo")
    .action((configPath: string) => {
      const container = getContainer();
      const result = container.validateWorkflowHandler.handle(configPath);
      printResult(getJson(), result, (r) => {
        if (r.valid) {
          console.log(`✅ "${r.workflowName}" is valid (${r.branchTypeCount} branch type(s)).`);
        } else {
          console.error(`❌ Invalid workflow config: ${r.error}`);
        }
      });
      if (!result.valid) process.exitCode = 1;
    });
}
