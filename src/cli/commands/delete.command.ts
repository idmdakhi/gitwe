import { Command } from "commander";
import { loadEngine, action, globalOptions } from "./shared.js";
import { printStructured, success } from "../output.js";
import { ValidationError } from "../../domain/errors/index.js";

export function deleteCommand(): Command {
  return new Command("delete")
    .description("delete a topic branch")
    .argument("[name]", "branch to delete (defaults to current)")
    .option("-f, --force", "delete even if unmerged", false)
    .option("-r, --remote", "also delete the remote branch", false)
    .action(
      action(async function (this: Command, name: string | undefined) {
        const engine = await loadEngine(this);
        const format = globalOptions(this).format;
        const opts = this.opts<{ force: boolean; remote: boolean }>();

        const branch = name ?? (await engine.overview()).currentBranch;
        if (!branch) {
          throw new ValidationError("no branch specified and none is currently checked out");
        }

        await engine.delete(branch, opts);
        const data = { branch, force: opts.force, remote: opts.remote };

        if (format === "json" || format === "yaml") {
          printStructured(data, format, { command: "delete" });
        } else {
          success(`deleted ${branch}`);
        }
      }),
    );
}
