import { Command } from "commander";
import { loadEngine, action } from "./shared.js";
import { style } from "../output.js";

export function listCommand(): Command {
  return new Command("list")
    .description("list topic branches")
    .argument("[type]", "restrict to a branch type")
    .argument("[pattern]", "glob to match short names")
    .action(
      action(async function (
        this: Command,
        out,
        type: string | undefined,
        pattern: string | undefined,
      ) {
        const engine = await loadEngine(this);
        const branches = await engine.list(type, pattern);

        const data = {
          type: type ?? null,
          pattern: pattern ?? null,
          branches: branches.map((b) => ({
            branch: b.branch,
            shortName: b.shortName,
            type: b.type.name,
          })),
        };

        if (branches.length === 0) {
          out.ok({
            data,
            message: style.dim("no matching branches"),
          });
          return;
        }

        out.ok({
          data,
          details: branches.map((b) => `${b.branch}  ${style.dim(`(${b.type.name})`)}`),
        });
      }),
    );
}
