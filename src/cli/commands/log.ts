import type { Command } from "commander";
import type { Container } from "../container";
import { reportError } from "../reportError";
import { printResult } from "../output";

export function registerLogCommand(program: Command, getContainer: () => Container, getJson: () => boolean): void {
  program
    .command("log [ref]")
    .description("Show recent commit history for a branch/ref (default: HEAD)")
    .option("-n, --limit <count>", "number of commits to show", "10")
    .action(async (ref: string | undefined, opts: { limit: string }) => {
      const container = getContainer();
      try {
        const commits = await container.git.getRecentCommits(ref ?? "HEAD", Number(opts.limit));
        printResult(getJson(), commits, (list) => {
          for (const commit of list) {
            console.log(`${commit.hash.slice(0, 8)}  ${commit.date.toISOString().slice(0, 10)}  ${commit.author}  ${commit.message}`);
          }
        });
      } catch (error) {
        process.exitCode = reportError(error, getJson());
      }
    });
}

