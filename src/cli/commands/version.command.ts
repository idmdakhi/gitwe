import { Command } from "commander";
import { globalOptions, action } from "./shared.js";
import { print, printStructured } from "../output.js";
import { version } from "../../version.js";

export function versionCommand(): Command {
  return new Command("version").description("show gitwe version").action(
    action(async function (this: Command) {
      const format = globalOptions(this).format;
      const data = { name: "gitwe", version };

      if (format === "json" || format === "yaml") {
        printStructured(data, format, { command: "version" });
      } else {
        print(version);
      }
    }),
  );
}
