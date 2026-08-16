import { Command } from "commander";
import { loadEngine, action } from "./shared.js";
import { ValidationError } from "../../domain/errors/index.js";

export function rebaseCommand(): Command {
  return new Command("rebase")
    .description("update the current (or named) topic branch by rebasing onto its base")
    .argument("[name]", "branch to rebase (defaults to current)")
    .option("--fetch", "fetch the base branch first", false)
    .action(
      action(async function (this: Command, out, name: string | undefined) {
        const engine = await loadEngine(this);
        const opts = this.opts<{ fetch: boolean }>();

        const branch = name ?? (await engine.overview()).currentBranch;
        if (!branch) {
          throw new ValidationError(
            "no branch specified and none is currently checked out",
            "check out a topic branch or provide a name",
          );
        }

        await engine.update(branch, { rebase: true, fetch: opts.fetch });

        out.ok({
          data: { branch, rebase: true, fetch: opts.fetch },
          message: `rebased ${branch}`,
        });
      }),
    );
}
