/**
 * `gitwe version` – print version with optional machine-readable format.
 */

import type { Command } from "commander";
import { print, printStructured } from "../output.js";
import { reportAndPrintError } from "../error-reporter.js";
import { resolveFormat } from "../options.js";

// In the real project this comes from src/version.ts which reads package.json
// For the integration layer we accept an injected version string.
export function registerVersionCommand(program: Command, getVersion: () => string): void {
  program
    .command("version")
    .description("Show gitwe version")
    .action((opts: { format?: string }) => {
      const format = resolveFormat(opts.format);
      const version = getVersion();
      try {
        if (format === "json" || format === "yaml") {
          printStructured({ version, name: "gitwe" }, format, { command: "version" });
        } else if (format === "table") {
          print(`name    version`);
          print(`gitwe   ${version}`);
        } else {
          print(version);
        }
        process.exitCode = 0;
      } catch (err) {
        process.exitCode = reportAndPrintError("version", err, format);
      }
    });
}
