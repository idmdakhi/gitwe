import { Command } from "commander";
import { loadEngine, action } from "./shared.js";
import { ValidationError } from "../../domain/errors/index.js";
import { style } from "../output.js";

export function syncCommand(): Command {
  return new Command("sync")
    .description("fetch remote and parent, then integrate both into the current branch")
    .option("--rebase", "use rebase instead of merge for both integrations", false)
    .action(
      action(async function (this: Command, out) {
        const engine = await loadEngine(this);
        const opts = this.opts<{ rebase: boolean }>();

        const branch = (await engine.overview()).currentBranch;
        if (!branch) {
          throw new ValidationError(
            "no branch is currently checked out",
            "check out a branch before running `gitwe sync`",
          );
        }

        // ۱. fetch remote‌ها (همانند pull)
        const fetchRemotes = engine.workflow.fetchRemotes();
        const fetched: string[] = [];
        for (const remote of fetchRemotes) {
          await engine["deps"].git.fetch(remote);
          fetched.push(remote);
        }

        // ۲. هماهنگی با upstream (remote tracking)
        const upstream = await engine["deps"].git.upstreamOf(branch);
        let pulled = false;
        if (upstream) {
          if (opts.rebase) {
            await engine["deps"].git.rebase(upstream);
          } else {
            await engine["deps"].git.merge(upstream);
          }
          pulled = true;
        }

        // ۳. هماهنگی با parent workflow
        const resolved = engine.workflow.resolveBranch(branch);
        if (!resolved) {
          throw new ValidationError(
            `"${branch}" is not a configured topic branch`,
            "sync only works on topic branches defined in the workflow",
          );
        }
        await engine.update(branch, { rebase: opts.rebase, fetch: false }); // fetch قبلاً انجام شده

        out.ok({
          data: {
            branch,
            rebase: opts.rebase,
            fetched,
            pulled,
            updated: true,
          },
          message: `synced ${branch} (remote + parent)`,
          details: [
            ...(fetched.length ? [style.dim(`fetched: ${fetched.join(", ")}`)] : []),
            ...(pulled ? [style.dim(`merged/rebased from ${upstream}`)] : []),
          ],
        });
      }),
    );
}
