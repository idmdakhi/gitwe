import { Command } from "commander";
import { loadEngine } from "./shared.js";

export function graphCommand(): Command {
  return new Command("graph")
    .description("show branch graph (base branches and topics)")
    .option("--root <branch>", "root branch to display commits from (omit to show all branches)")
    .action(async function (this: Command) {
      const engine = await loadEngine(this);
      const opts = this.opts<{ root?: string }>();
      const output = await engine.graph(opts.root);
      console.log(output);
    });
}
