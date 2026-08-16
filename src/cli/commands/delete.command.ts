import { Command } from "commander";
import { loadEngine, action } from "./shared.js";
import { ValidationError } from "../../domain/errors/index.js";

export function deleteCommand(): Command {
  return new Command("delete")
    .description("delete a topic branch")
    .argument("[name]", "branch to delete (defaults to current)")
    .option("-f, --force", "delete even if unmerged", false)
    .option("-r, --remote", "also delete the remote branch", false)
    .action(
      action(async function (this: Command, out, name: string | undefined) {
        const engine = await loadEngine(this);
        const opts = this.opts<{ force: boolean; remote: boolean }>();

        const branch = name ?? (await engine.overview()).currentBranch;
        if (!branch) {
          throw new ValidationError("no branch specified and none is currently checked out");
        }

        await engine.delete(branch, opts);

        out.ok({
          data: { branch, force: opts.force, remote: opts.remote },
          message: `deleted ${branch}`,
        });
      }),
    );
}
