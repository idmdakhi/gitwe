import { Command } from "commander";
import { loadEngine, action } from "./shared.js";

export function updateCommand(): Command {
  return new Command("update")
    .description("update a topic branch with its base")
    .argument("<name>", "branch to update")
    .option("--rebase", "rebase instead of merge", false)
    .option("--fetch", "fetch the base branch first", false)
    .action(
      action(async function (this: Command, name: string) {
        const engine = await loadEngine(this);
        const opts = this.opts<{ rebase: boolean; fetch: boolean }>();
        await engine.update(name, opts);
        console.log(`updated ${name}`);
      }),
    );
}
