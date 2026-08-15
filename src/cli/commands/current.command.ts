import { Command } from "commander";
import { loadEngine, action, globalOptions } from "./shared.js";
import { print, printStructured, style } from "../output.js";

export function currentCommand(): Command {
  return new Command("current")
    .description("show information about the current topic branch")
    .action(
      action(async function (this: Command) {
        const engine = await loadEngine(this);
        const format = globalOptions(this).format;
        const overview = await engine.overview();
        const branch = overview.currentBranch;
        const resolved = branch ? engine.workflow.resolveBranch(branch) : undefined;

        const data = {
          branch: branch ?? null,
          detached: branch === undefined,
          type: resolved?.type.name ?? null,
          shortName: resolved?.shortName ?? null,
          base: resolved?.type.base ?? null,
          target: resolved ? [...resolved.type.target] : null,
        };

        if (format === "json" || format === "yaml") {
          printStructured(data, format, { command: "current" });
          return;
        }

        if (!branch) {
          print(style.dim("(detached HEAD)"));
          return;
        }

        if (!resolved) {
          print(`${branch}  ${style.dim("(not a configured topic branch)")}`);
          return;
        }

        print(
          `${style.bold(resolved.branch)}  ${style.dim(
            `type=${resolved.type.name}  base=${resolved.type.base}`,
          )}`,
        );
      }),
    );
}
