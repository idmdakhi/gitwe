import { Command } from "commander";
import { loadEngine, action } from "./shared.js";
import { ValidationError } from "../../domain/errors/index.js";

export function updateCommand(): Command {
  return new Command("update")
    .description("update a topic branch with its base")
    .argument("[name]", "branch to update (defaults to current)")
    .option("--rebase", "rebase instead of merge", false)
    .option("--fetch", "fetch the base branch first", false)
    .action(
      action(async function (this: Command, out, name: string | undefined) {
        const engine = await loadEngine(this);
        const opts = this.opts<{ rebase: boolean; fetch: boolean }>();

        const branch = name ?? (await engine.overview()).currentBranch;
        if (!branch) {
          throw new ValidationError("no branch specified and none is currently checked out");
        }

        await engine.update(branch, opts);

        out.ok({
          data: { branch, rebase: opts.rebase, fetch: opts.fetch },
          message: `updated ${branch}`,
        });
      }),
    );
}
