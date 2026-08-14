import { Command } from "commander";
import { createEngine } from "../context.js";
import type { GlobalOptions } from "../options.js";
import { print, style, printStructured } from "../output.js";

/**
 * Register `gitwe clean` — report (or remove) a stale finish operation state file.
 * Does not delete branches or worktree files.
 */
export function registerCleanCommand(program: Command, globals: () => GlobalOptions): void {
  program
    .command("clean")
    .description("remove a stale gitwe operation state file (does not touch branches)")
    .option("-f, --force", "actually delete the state file")
    .action(async (opts: { force?: boolean }) => {
      const format = globals().format;
      const engine = await createEngine(globals());
      const exists = engine.context.state.exists();

      if (!exists) {
        if (format === "json" || format === "yaml") {
          printStructured({ staleOperation: false }, format);
        } else {
          print(style.dim("no stale operation state"));
        }
        return;
      }

      if (opts.force === true) {
        engine.context.state.clear();
        if (format === "json" || format === "yaml") {
          printStructured({ staleOperation: true, cleared: true }, format);
        } else {
          print(style.green("✓ cleared stale operation state"));
        }
        return;
      }

      if (format === "json" || format === "yaml") {
        printStructured({ staleOperation: true, cleared: false }, format);
      } else {
        print(style.yellow("! stale operation state present"));
        print(
          style.dim(
            "  run `gitwe clean --force` to remove it, or `gitwe finish --continue` / `--abort`",
          ),
        );
      }
    });
}
