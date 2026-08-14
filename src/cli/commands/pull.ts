import { Command } from "commander";
import { createEngine } from "../context.js";
import type { GlobalOptions } from "../options.js";
import { printStructured, success } from "../output.js";

/** Register `gitwe pull` — fetch and integrate the current branch from its upstream. */
export function registerPullCommand(program: Command, globals: () => GlobalOptions): void {
  program
    .command("pull")
    .description("fetch the configured remote (use git pull for merge/rebase integration)")
    .action(async () => {
      const format = globals().format;
      const engine = await createEngine(globals());
      const remote = engine.workflow.remoteName;
      await engine.git.fetch(remote as string);
      if (format === "json" || format === "yaml") {
        printStructured({ remote, fetched: true }, format);
      } else {
        success(`fetched ${remote}`);
      }
    });
}
