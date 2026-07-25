import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { printResult } from "#gitwe/cli/output";

export function registerModulesCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("modules")
    .description("List the capabilities currently registered with the kernel")
    .action(() => {
      const container = getContainer();
      const modules = container.kernel.list();
      printResult(getJson(), modules, (list) => {
        for (const m of list) {
          console.log(`${m.name.padEnd(10)} ${m.description}`);
        }
      });
    });
}
