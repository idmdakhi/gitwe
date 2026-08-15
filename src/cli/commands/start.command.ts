import { Command } from "commander";
import { loadEngine, action, globalOptions } from "./shared.js";
import { printStructured, success } from "../output.js";

export function startCommand(): Command {
  return new Command("start")
    .description("create a new topic branch")
    .argument("<type>", "branch type, e.g. feature")
    .argument("<name>", "short branch name, e.g. login")
    .argument("[base]", "override the configured base branch")
    .option("--fetch", "fetch the base branch first", false)
    .action(
      action(async function (this: Command, type: string, name: string, base: string | undefined) {
        const engine = await loadEngine(this);
        const format = globalOptions(this).format;
        const opts = this.opts<{ fetch: boolean }>();
        const resolved = await engine.start(type, name, {
          fetch: opts.fetch,
          ...(base ? { base } : {}),
        });

        const data = {
          branch: resolved.branch,
          shortName: resolved.shortName,
          type: resolved.type.name,
          base: resolved.type.base,
        };

        if (format === "json" || format === "yaml") {
          printStructured(data, format, { command: "start" });
          return;
        }
        success(`switched to a new branch "${resolved.branch}"`);
      }),
    );
}
