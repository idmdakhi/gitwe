import type { Command } from "commander";
import type { Container } from "../container";
import { reportError } from "../reportError";

export function registerStartCommand(program: Command, getContainer: () => Container): void {
  program
    .command("start <type> <shortName>")
    .description("Start a new branch of the given type, e.g. `gitwe start feature login`")
    .action(async (type: string, shortName: string) => {
      const container = getContainer();
      try {
        const result = await container.startBranchHandler.handle({ branchType: type, shortName });
        console.log(`✅ Started ${result.branchName} from ${result.baseBranch}`);
      } catch (error) {
        process.exitCode = reportError(error);
      }
    });
}
