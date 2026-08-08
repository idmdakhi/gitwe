import { Command } from "commander";
import type { GlobalOptions } from "../options.js";
import { print, style } from "../output.js";

/**
 * Placeholder for monorepo / path-based workflow modules (planned for 1.3).
 */
export function registerModules(program: Command, _globals: () => GlobalOptions): void {
  program
    .command("modules")
    .description("list path-based workflow modules (planned for 1.3)")
    .action(() => {
      print(style.yellow("modules is planned for phase 1.3 (monorepo support)."));
      print(style.dim("See docs/development/ROADMAP.md"));
      process.exitCode = 1;
    });
}
