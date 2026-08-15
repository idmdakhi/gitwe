import { Command } from "commander";
import { Engine } from "../../application/engine.js";
import { buildEngineDeps } from "../container.js";
import { action, globalOptions } from "./shared.js";

export function initCommand(): Command {
  return new Command("init")
    .description("create a workflow definition in this repository")
    .option("--preset <name>", "classic | github | gitlab", "classic")
    .option("--force", "overwrite an existing definition", false)
    .action(
      action(async function (this: Command) {
        const preset = this.opts<{ preset: "classic" | "github" | "gitlab"; force: boolean }>();
        const engine = await Engine.init(buildEngineDeps(globalOptions(this)), preset.preset, preset.force);
        console.log(`initialised "${engine.config.name}" workflow at .gitwe/gitwe.yaml`);
      }),
    );
}
