import { Command } from "commander";
import { loadEngine, action } from "./shared.js";
import { ValidationError } from "../../domain/errors/index.js";

export function publishCommand(): Command {
  return new Command("publish")
    .alias("push")
    .description("push a topic branch and set its upstream")
    .argument("[name]", "branch to publish (defaults to current)")
    .option("--force", "force-push with lease", false)
    .action(
      action(async function (this: Command, out, name: string | undefined) {
        const engine = await loadEngine(this);
        const opts = this.opts<{ force: boolean }>();

        const branch = name ?? (await engine.overview()).currentBranch;
        if (!branch) {
          throw new ValidationError("no branch specified and none is currently checked out");
        }

        const remotes = await engine.publish(branch, opts);

        out.ok({
          data: { branch, remotes },
          message: `published ${branch} to ${remotes.join(", ")}`,
        });
      }),
    );
}
