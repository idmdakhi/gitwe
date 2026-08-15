import { Command } from "commander";
import { loadEngine, action } from "./shared.js";

export function deleteCommand(): Command {
  return new Command("delete")
    .description("delete a topic branch")
    .argument("<name>", "branch to delete")
    .option("-f, --force", "delete even if unmerged", false)
    .option("-r, --remote", "also delete the remote branch", false)
    .action(
      action(async function (this: Command, name: string) {
        const engine = await loadEngine(this);
        const opts = this.opts<{ force: boolean; remote: boolean }>();
        await engine.delete(name, opts);
        console.log(`deleted ${name}`);
      }),
    );
}
