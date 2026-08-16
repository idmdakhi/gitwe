import { Command } from "commander";
import { action } from "./shared.js";
import { version } from "../../version.js";

export function versionCommand(): Command {
  return new Command("version").description("show gitwe version").action(
    action(async function (this: Command, out) {
      out.ok({
        data: { name: "gitwe", version },
        message: version,
      });
    }),
  );
}
