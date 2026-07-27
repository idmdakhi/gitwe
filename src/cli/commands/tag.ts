import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { reportError } from "#gitwe/cli/reportError";
import { printResult } from "#gitwe/cli/output";

export interface TagInput {
  tag: string;
  message?: string;
  push?: boolean;
  remote?: string;
}

export interface TagOutput {
  tag: string;
  created: boolean;
  pushed?: boolean;
}

export function registerTagCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("tag <name>")
    .description("Create a git tag")
    .option("--message <msg>", "Tag message")
    .option("--push", "Push tag to remote")
    .option("--remote <name>", "Remote to push to (default: origin)", "origin")
    .action(async (name: string, opts: { message?: string; push?: boolean; remote?: string }) => {
      const container = getContainer();
      const json = getJson();
      try {
        const result = await container.kernel.run<TagInput, TagOutput>("tag", {
          tag: name,
          message: opts.message,
          push: opts.push,
          remote: opts.remote,
        });
        printResult(json, result, (r) => {
          console.log(`✅ Tag ${r.tag} created${r.pushed ? " and pushed" : ""}`);
        });
      } catch (error) {
        process.exitCode = reportError(error, json);
      }
    });
}
