import type { Command } from "commander";
import type { Container } from "../container";
import { reportError } from "../reportError";
import { printResult } from "../output";

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
        const result = await container.startBranchHandler.handle({ branchType: type, shortName });
        printResult(getJson(), result, (r) => {
          console.log(`✅ Started ${r.branchName} from ${r.baseBranch}`);
        });
      } catch (error) {
        process.exitCode = reportError(error, getJson());
      }
    });
}
