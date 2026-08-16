import { Command } from "commander";
import { loadEngine, action } from "./shared.js";
import { style } from "../output.js";

export function currentCommand(): Command {
  return new Command("current")
    .description("show information about the current topic branch")
    .action(
      action(async function (this: Command, out) {
        const engine = await loadEngine(this);
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

        if (!branch) {
          out.ok({
            data,
            message: style.dim("(detached HEAD)"),
          });
          return;
        }

        if (!resolved) {
          out.ok({
            data,
            message: `${branch}  ${style.dim("(not a configured topic branch)")}`,
          });
          return;
        }

        out.ok({
          data,
          message: `${style.bold(resolved.branch)}  ${style.dim(
            `type=${resolved.type.name}  base=${resolved.type.base}`,
          )}`,
        });
      }),
    );
}
