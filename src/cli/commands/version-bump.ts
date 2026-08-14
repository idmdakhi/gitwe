import { Command } from "commander";
import type { GlobalOptions } from "../options.js";
import { print, style } from "../output.js";

/**
 * Placeholder for automated version bumping.
 * Removed from scope in the 1.0 rewrite (see CHANGELOG).
 */
export function registerVersionBumpCommand(program: Command, _globals: () => GlobalOptions): void {
  program
    .command("version-bump")
    .description("bump package version (not implemented — out of scope for 1.0)")
    .action(() => {
      print(style.yellow("version-bump is not part of the 1.0 workflow engine."));
      print(
        style.dim(
          "Versioning and changelog automation were removed on purpose; use your release tool.",
        ),
      );
      process.exitCode = 1;
    });
}
