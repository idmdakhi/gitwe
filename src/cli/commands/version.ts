import { Command } from "commander";
import { VERSION } from "../../version.js";
import type { GlobalOptions } from "../options.js";
import { print, printStructured } from "../output.js";

/** Register `gitwe version` (also available via the global `--version` flag). */
export function registerVersion(program: Command, globals: () => GlobalOptions): void {
  program
    .command("version")
    .description("show the gitwe version")
    .action(() => {
      const format = globals().format;
      const data = { version: VERSION, schemaVersion: 1 };
      if (format === "json" || format === "yaml") {
        printStructured(data, format);
      } else {
        print(VERSION);
      }
    });
}
