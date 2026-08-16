import { Command } from "commander";
import { loadEngine, action } from "./shared.js";
import { ValidationError } from "../../domain/errors/index.js";

/**
 * Register `gitwe sync`.
 *
 * Fetch configured remotes and update the current topic branch
 * from its workflow parent.
 *
 * Equivalent to:
 *   gitwe update --fetch
 *
 * By default the update is performed with merge.
 * Use `--rebase` to rebase the topic onto its parent.
 */
export function syncCommand(): Command {
  return new Command("sync")
    .description("fetch the remote and update the current topic branch from its parent")
    .option("--rebase", "rebase onto the parent instead of merging", false)
    .action(
      action(async function (this: Command, out) {
        const engine = await loadEngine(this);
        const opts = this.opts<{ rebase: boolean }>();

        const branch = (await engine.overview()).currentBranch;

        if (!branch) {
          throw new ValidationError(
            "no topic branch is currently checked out",
            "check out a topic branch before running `gitwe sync`",
          );
        }

        await engine.update(branch, {
          rebase: opts.rebase,
          fetch: true,
        });

        out.ok({
          data: {
            branch,
            rebase: opts.rebase,
            fetch: true,
          },
          message: opts.rebase
            ? `synced ${branch} by rebasing onto its parent`
            : `synced ${branch} by merging its parent`,
        });
      }),
    );
}
