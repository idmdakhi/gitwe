import { Command } from "commander";
import { loadEngine, action } from "./shared.js";

export function startCommand(): Command {
  return new Command("start")
    .description("create a new topic branch")
    .argument("<type>", "branch type, e.g. feature")
    .argument("<name>", "short branch name, e.g. login")
    .argument("[base]", "override the configured base branch")
    .option("--fetch", "fetch the base branch first", false)
    .action(
      action(async function (
        this: Command,
        out,
        type: string,
        name: string,
        base: string | undefined,
      ) {
        const engine = await loadEngine(this);
        const opts = this.opts<{ fetch: boolean }>();
        const resolved = await engine.start(type, name, {
          fetch: opts.fetch,
          ...(base ? { base } : {}),
        });

        out.ok({
          data: {
            branch: resolved.branch,
            shortName: resolved.shortName,
            type: resolved.type.name,
            base: resolved.type.base,
          },
          message: `switched to a new branch "${resolved.branch}"`,
        });
      }),
    );
}
