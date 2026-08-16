import { Command } from "commander";
import { loadEngine, action } from "./shared.js";

export function trackCommand(): Command {
  return new Command("track")
    .description("create a local topic branch tracking the remote one")
    .argument(
      "<branch-or-type>",
      "topic type (e.g. feature) or full branch name (e.g. feature/login)",
    )
    .argument("[name]", "short branch name (required if the first arg is a type)")
    .action(
      action(async function (this: Command, out, branchOrType: string, name: string | undefined) {
        const engine = await loadEngine(this);
        const result = await engine.track(branchOrType, name);

        out.ok({
          data: result,
          message: `created local branch "${result.branch}" tracking ${result.remote}/${result.branch}`,
        });
      }),
    );
}
