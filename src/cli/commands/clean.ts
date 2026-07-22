import type { Command } from "commander";
import type { Container } from "../container";
import { reportError } from "../reportError";
import { printResult } from "../output";

export function registerCleanCommand(program: Command, getContainer: () => Container, getJson: () => boolean): void {
  program
    .command("clean")
    .description("Delete local branches that are fully merged into their configured targets")
    .option("--dry-run", "list what would be deleted without deleting anything")
    .action(async (opts: { dryRun?: boolean }) => {
      const container = getContainer();
      const json = getJson();
      try {
        const result = await container.cleanupHandler.handle({ dryRun: opts.dryRun });
        printResult(json, result, (r) => {
          if (r.candidates.length === 0) {
            console.log("Nothing to clean up.");
            return;
          }
          for (const candidate of r.candidates) {
            const verb = r.dryRun ? "would delete" : "deleted";
            console.log(`${r.dryRun ? "🔎" : "🗑️ "} ${verb}: ${candidate.branchName} (merged into ${candidate.mergedInto.join(", ")})`);
          }
        });
      } catch (error) {
        process.exitCode = reportError(error, json);
      }
    });
}

