import { Command } from "commander";
import { loadEngine, action } from "./shared.js";

export function publishCommand(): Command {
  return new Command("publish")
    .alias("push")
    .description("push a topic branch and set its upstream")
    .argument("<name>", "branch to publish")
    .option("--force", "force-push with lease", false)
    .action(
      action(async function (this: Command, name: string) {
        const engine = await loadEngine(this);
        const opts = this.opts<{ force: boolean }>();
        const remotes = await engine.publish(name, opts);
        console.log(`published ${name} to ${remotes.join(", ")}`);
      }),
    );
}
