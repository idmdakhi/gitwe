import { Command } from "commander";
import { loadEngine, action } from "./shared.js";
import { style } from "../output.js";

/**
 * Fetch configured remotes and integrate the current branch from its upstream.
 * For updating a topic from its *workflow base*, use `gitwe update` instead.
 */
export function pullCommand(): Command {
  return new Command("pull")
    .description("fetch configured remotes and integrate the current branch from its upstream")
    .option("--rebase", "rebase onto upstream instead of merging", false)
    .action(
      action(async function (this: Command, out) {
        const engine = await loadEngine(this);
        const opts = this.opts<{ rebase: boolean }>();
        const result = await engine.pull({ rebase: opts.rebase });

        if (!result.integrated) {
          out.ok({
            data: result,
            message:
              result.fetched.length > 0
                ? `fetched ${result.fetched.join(", ")} — no upstream set for ${result.branch}`
                : `no remotes fetched; no upstream set for ${result.branch}`,
            details: [
              style.dim("set upstream with: gitwe publish"),
              style.dim("or: git branch -u <remote>/<branch>"),
            ],
          });
          return;
        }

        const how = result.rebase ? "rebased onto" : "merged";
        out.ok({
          data: result,
          message: `${how} ${result.upstream} into ${result.branch}`,
          details:
            result.fetched.length > 0 ? [style.dim(`fetched: ${result.fetched.join(", ")}`)] : [],
        });
      }),
    );
}
