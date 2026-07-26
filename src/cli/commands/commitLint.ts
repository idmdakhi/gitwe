import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { reportError } from "#gitwe/cli/reportError";
import { printResult } from "#gitwe/cli/output";

export function registerCommitLintCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("commit-lint [ref]")
    .description(
      "Validate a commit message against the workflow's Conventional Commits policy (default: HEAD)",
    )
    .action(async (ref: string | undefined) => {
      const container = getContainer();
      const json = getJson();
      try {
        const commit = await container.git.getCommitInfo(ref ?? "HEAD");
        const violation = container.workflow.commitPolicy.validate(commit.message);
        const result = {
          ref: ref ?? "HEAD",
          message: commit.message,
          valid: !violation,
          reason: violation,
        };
        printResult(json, result, (r) => {
          if (r.valid) {
            console.log(`✅ "${r.message}" is a valid commit message.`);
          } else {
            console.error(`❌ "${r.message}" — ${r.reason}`);
          }
        });
        if (violation) process.exitCode = 1;
      } catch (error) {
        process.exitCode = reportError(error, json);
      }
    });
}
