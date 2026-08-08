import { Command } from "commander";
import { createEngine } from "../context.js";
import type { GlobalOptions } from "../options.js";
import { print, style, printStructured, success } from "../output.js";

/** Register `gitwe tag` — list tags, or create an annotated tag. */
export function registerTag(program: Command, globals: () => GlobalOptions): void {
  program
    .command("tag")
    .description("list tags, or create an annotated tag")
    .argument("[name]", "tag name to create (omit to list)")
    .option("-m, --message <message>", "annotated tag message")
    .option("-d, --delete", "delete the named tag")
    .action(async (name: string | undefined, opts: { message?: string; delete?: boolean }) => {
      const format = globals().format;
      const engine = await createEngine(globals());

      if (name === undefined) {
        const tags = await engine.git.tags();
        if (format === "json" || format === "yaml") {
          printStructured({ tags }, format);
          return;
        }
        if (tags.length === 0) {
          print(style.dim("no tags"));
          return;
        }
        for (const t of tags) print(t);
        return;
      }

      if (opts.delete === true) {
        await engine.git.deleteTag(name);
        if (format === "json" || format === "yaml") {
          printStructured({ deleted: name }, format);
        } else {
          success(`deleted tag ${name}`);
        }
        return;
      }

      await engine.git.createTag(name, { message: opts.message ?? name });
      if (format === "json" || format === "yaml") {
        printStructured({ tag: name }, format);
      } else {
        success(`created tag ${name}`);
      }
    });
}
