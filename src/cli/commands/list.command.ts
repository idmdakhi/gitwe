import { Command } from "commander";
import { loadEngine, action } from "./shared.js";

export function listCommand(): Command {
  return new Command("list")
    .description("list topic branches")
    .argument("[type]", "restrict to a branch type")
    .argument("[pattern]", "glob to match short names")
    .action(
      action(async function (this: Command, type: string | undefined, pattern: string | undefined) {
        const engine = await loadEngine(this);
        const branches = await engine.list(type, pattern);
        if (branches.length === 0) {
          console.log("no matching branches");
          return;
        }
        for (const b of branches) console.log(`${b.branch}  (${b.type.name})`);
      }),
    );
}
