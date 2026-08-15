import { Command } from "commander";
import { loadEngine, action, globalOptions } from "./shared.js";
import { printStructured, success } from "../output.js";
import { ValidationError } from "../../domain/errors/index.js";

export function updateCommand(): Command {
  return new Command("update")
    .description("update a topic branch with its base")
    .argument("[name]", "branch to update (defaults to current)")
    .option("--rebase", "rebase instead of merge", false)
    .option("--fetch", "fetch the base branch first", false)
    .action(
      action(async function (this: Command, name: string | undefined) {
        const engine = await loadEngine(this);
        const format = globalOptions(this).format;
        const opts = this.opts<{ rebase: boolean; fetch: boolean }>();

        const branch = name ?? (await engine.overview()).currentBranch;
        if (!branch) {
          throw new ValidationError("no branch specified and none is currently checked out");
        }

        await engine.update(branch, opts);

        const data = { branch, rebase: opts.rebase, fetch: opts.fetch };
        if (format === "json" || format === "yaml") {
          printStructured(data, format, { command: "update" });
        } else {
          success(`updated ${branch}`);
        }
      }),
    );
}
