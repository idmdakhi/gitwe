import { Command } from "commander";
import { loadEngine, action } from "./shared.js";

export function tagCommand(): Command {
  return new Command("tag")
    .description("list, create, delete, or push tags")
    .argument("[name]", "tag name to create or delete (omit to list)")
    .option("-m, --message <message>", "annotated tag message (used when creating)")
    .option("-d, --delete", "delete the local tag", false)
    .option("--delete-remote", "delete the remote tag (can be used with --delete or alone)", false)
    .option("-p, --push", "push the newly created tag to the default remote", false)
    .option("--push-all", "push all tags to the default remote", false)
    .action(
      action(async function (this: Command, out, name: string | undefined) {
        const engine = await loadEngine(this);
        const opts = this.opts<{
          message?: string;
          delete: boolean;
          deleteRemote: boolean;
          push: boolean;
          pushAll: boolean;
        }>();

        // Validate combinations
        if (opts.push && opts.pushAll) {
          throw new Error("cannot use both --push and --push-all");
        }
        if (opts.delete && opts.push) {
          throw new Error("cannot use --delete and --push together");
        }
        if (opts.delete && opts.pushAll) {
          throw new Error("cannot use --delete and --push-all together");
        }
        if (opts.deleteRemote && opts.push) {
          throw new Error("cannot use --delete-remote and --push together");
        }
        if (opts.deleteRemote && opts.pushAll) {
          throw new Error("cannot use --delete-remote and --push-all together");
        }

        const result = await engine.tag(name, {
          message: opts.message,
          delete: opts.delete,
          deleteRemote: opts.deleteRemote,
          push: opts.push,
          pushAll: opts.pushAll,
        });

        // --- Deletion ---
        if (result.deleted && result.deletedRemote) {
          out.ok({
            data: result,
            message: `deleted tag "${result.deleted}" (local and remote)`,
          });
          return;
        }

        if (result.deleted) {
          out.ok({
            data: result,
            message: `deleted local tag "${result.deleted}"`,
          });
          return;
        }

        if (result.deletedRemote) {
          out.ok({
            data: result,
            message: `deleted remote tag "${result.deletedRemote}"`,
          });
          return;
        }

        // --- Creation ---
        if (result.created) {
          const details = [];
          if (result.pushed) details.push("pushed to remote");
          if (result.pushedAll) details.push("pushed all tags to remote");

          out.ok({
            data: result,
            message: `created tag "${result.created}"`,
            details: details.length ? details : undefined,
          });
          return;
        }

        // --- List ---
        if (result.tags.length === 0) {
          out.ok({
            data: result,
            message: "no tags found",
          });
        } else {
          out.ok({
            data: result,
            details: result.tags.map((t) => `  ${t}`),
          });
        }
      }),
    );
}
