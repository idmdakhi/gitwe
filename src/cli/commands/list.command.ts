import { Command } from "commander";
import { loadEngine, action, globalOptions } from "./shared.js";
import { print, printStructured, style } from "../output.js";

export function listCommand(): Command {
  return new Command("list")
    .description("list topic branches")
    .argument("[type]", "restrict to a branch type")
    .argument("[pattern]", "glob to match short names")
    .action(
      action(async function (this: Command, type: string | undefined, pattern: string | undefined) {
        const engine = await loadEngine(this);
        const format = globalOptions(this).format;
        const branches = await engine.list(type, pattern);

        if (format === "json" || format === "yaml") {
          printStructured(
            {
              type: type ?? null,
              pattern: pattern ?? null,
              branches: branches.map((b) => ({
                branch: b.branch,
                shortName: b.shortName,
                type: b.type.name,
              })),
            },
            format,
            { command: "list" },
          );
          return;
        }

        if (branches.length === 0) {
          print(style.dim("no matching branches"));
          return;
        }
        for (const b of branches) {
          print(`${b.branch}  ${style.dim(`(${b.type.name})`)}`);
        }
      }),
    );
}
