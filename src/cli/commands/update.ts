import { Command } from "commander";
import { createEngine } from "../context.js";
import { print, style, success, printStructured } from "../output.js";
import type { GlobalOptions } from "../options.js";

export function registerUpdate(program: Command, globals: () => GlobalOptions): void {
  program
    .command("update")
    .description("update the current (or named) topic branch from its parent")
    .argument("[name]")
    .option("--rebase", "rebase instead of the configured downstream strategy")
    .option("--fetch", "fetch the remote first")
    .action(async (name: string | undefined, opts: { rebase?: boolean; fetch?: boolean }) => {
      const engine = await createEngine(globals());
      const topic = await engine.resolveTarget(undefined, name);
      const result = await engine.update(topic, opts);
      const format = globals().format;
      if (format === "json" || format === "yaml") {
        printStructured(result, format!);
      } else if (result.alreadyUpToDate) {
        print(style.dim(`${result.branch} is already up to date`));
      } else {
        success(`updated ${result.branch} from ${result.base} (${result.strategy})`);
      }
    });
}
