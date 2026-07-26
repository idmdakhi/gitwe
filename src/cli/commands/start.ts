import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import type { StartBranchCommand } from "#gitwe/application/commands/StartBranchCommand";
import type { StartBranchResult } from "#gitwe/application/dto/StartBranchResult";
import { reportError } from "#gitwe/cli/reportError";
import { printResult } from "#gitwe/cli/output";

export function registerStartCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("start <type> <shortName>")
    .description("Start a new branch of the given type, e.g. `gitwe start feature login`")
    .action(async (type: string, shortName: string) => {
      const container = getContainer();
      try {
        const result = await container.kernel.run<StartBranchCommand, StartBranchResult>("start", {
          branchType: type,
          shortName,
        });
        printResult(getJson(), result, (r) => {
          console.log(`✅ Started ${r.branchName} from ${r.baseBranch}`);
        });
      } catch (error) {
        process.exitCode = reportError(error, getJson());
      }
    });
}
