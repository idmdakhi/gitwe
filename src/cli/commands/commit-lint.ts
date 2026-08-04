import { Command } from "commander";
import type { GlobalOptions } from "../options.js";
import { print, style } from "../output.js";

/**
 * Placeholder for conventional-commit linting.
 * Out of scope for the 1.0 workflow engine (see CHANGELOG / ROADMAP).
 */
export function registerCommitLint(program: Command, _globals: () => GlobalOptions): void {
  program
    .command("commit-lint")
    .description("lint commit messages (not implemented — out of scope for 1.0)")
    .action(() => {
      print(style.yellow("commit-lint is not part of the 1.0 workflow engine."));
      print(style.dim("See ROADMAP.md — conventional-commit policies were removed on purpose."));
      process.exitCode = 1;
    });
}
