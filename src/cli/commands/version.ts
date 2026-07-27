import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { printResult } from "#gitwe/cli/output";
import { reportError } from "#gitwe/cli/reportError";
import type { VersionShowInput, VersionShowOutput } from "#gitwe/kernel/modules/VersionModule";

export function registerVersionCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("version")
    .description("Show the current version and its source")
    .option("--json", "Output as JSON (overrides global --json)")
    .action(async (opts: { json?: boolean }) => {
      const container = getContainer();
      const json = opts.json ?? getJson();
      try {
        const input: VersionShowInput = {}; // خالی
        const result = await container.capabilities.run<VersionInput, VersionOutput>(
          "version",
          { action: "resolve" },
          context,
        );
        printResult(json, result, (r: VersionShowOutput) => {
          console.log(`Current version: ${r.version}`);
          if (r.source) console.log(`Source: ${r.source}`);
          if (r.isPrerelease) console.log("⚠️  Prerelease version");
          console.log(`Tag prefix: ${r.tagPrefix}`);
        });
      } catch (error) {
        process.exitCode = reportError(error, json);
      }
    });
}
