import { Command } from "commander";
import { loadEngine, action, globalOptions } from "./shared.js";
import { printStructured, success } from "../output.js";
import { ValidationError } from "../../domain/errors/index.js";

export function publishCommand(): Command {
  return new Command("publish")
    .alias("push")
    .description("push a topic branch and set its upstream")
    .argument("[name]", "branch to publish (defaults to current)")
    .option("--force", "force-push with lease", false)
    .action(
      action(async function (this: Command, name: string | undefined) {
        const engine = await loadEngine(this);
        const format = globalOptions(this).format;
        const opts = this.opts<{ force: boolean }>();

        const branch = name ?? (await engine.overview()).currentBranch;
        if (!branch) {
          throw new ValidationError("no branch specified and none is currently checked out");
        }

        const remotes = await engine.publish(branch, opts);
        const data = { branch, remotes };

        if (format === "json" || format === "yaml") {
          printStructured(data, format, { command: "publish" });
        } else {
          success(`published ${branch} to ${remotes.join(", ")}`);
        }
      }),
    );
}
