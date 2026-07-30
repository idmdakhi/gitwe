import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { printResult } from "#gitwe/cli/output";
import { reportError } from "#gitwe/cli/reportError";
import type { VersionBumpInput, VersionBumpOutput } from "#gitwe/kernel/modules/VersionModule";
import type { VersionBump } from "#gitwe/domain/valueObjects/VersionBump";

export function registerVersionBumpCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("bump")
    .description("Bump the version (major, minor, patch, prerelease)")
    .option("--major", "Bump major version")
    .option("--minor", "Bump minor version")
    .option("--patch", "Bump patch version")
    .option("--prerelease [id]", "Bump prerelease (e.g. beta, alpha)")
    .option("--dry-run", "Show what would happen without making changes")
    .option("--json", "Output as JSON (overrides global --json)")
    .action(
      async (opts: {
        major?: boolean;
        minor?: boolean;
        patch?: boolean;
        prerelease?: string | boolean;
        dryRun?: boolean;
        json?: boolean;
      }) => {
        const container = getContainer();
        const json = opts.json ?? getJson();

        let kind: VersionBump | undefined;
        // فقط زمانی که flag به‌صراحت true باشد، kind را تنظیم کن
        if (opts.major === true) kind = "major";
        else if (opts.minor === true) kind = "minor";
        else if (opts.patch === true) kind = "patch";
        else if (opts.prerelease !== undefined) kind = "prerelease";

        if (!kind) {
          console.error("❌ Please specify --major, --minor, --patch, or --prerelease");
          process.exitCode = 1;
          return;
        }

        try {
          const input: VersionBumpInput = {
            kind,
            prereleaseId:
              kind === "prerelease" && typeof opts.prerelease === "string"
                ? opts.prerelease
                : kind === "prerelease"
                  ? "beta"
                  : undefined,
            dryRun: opts.dryRun ?? false,
          };

          const result = await container.kernel.run<VersionBumpInput, VersionBumpOutput>(
            "version:bump",
            input,
          );

          printResult(json, result, (r) => {
            const verb = r.dryRun ? "would bump" : "bumped";
            console.log(`✅ ${verb} ${r.previous} → ${r.next}`);
            console.log(`🏷️  Tag: ${r.tag}`);
            if (r.changelogPath) console.log(`📝 Changelog: ${r.changelogPath}`);
          });
        } catch (error) {
          process.exitCode = reportError(error, json);
        }
      },
    );
}
