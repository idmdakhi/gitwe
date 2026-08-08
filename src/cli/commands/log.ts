import { Command } from "commander";
import { print, style } from "../output.js";
import type { GlobalOptions } from "../options.js";

export function registerLog(program: Command, globals: () => GlobalOptions): void {
  program
    .command("log")
    .description("show git log with workflow context (placeholder)")
    .action(() => {
      print(style.yellow("log command is not yet implemented"));
    });
}
