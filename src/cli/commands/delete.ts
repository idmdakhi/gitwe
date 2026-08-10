import { Command } from "commander";
import { createEngine } from "../context.js";
import { success, printStructured } from "../output.js";
import type { GlobalOptions } from "../options.js";

export function registerDelete(program: Command, globals: () => GlobalOptions): void {
  program
    .command("delete")
    .description("delete the current (or named) topic branch")
    .argument("[name]")
    .option("-f, --force", "delete even if the branch is not fully merged")
    .option("-r, --remote", "delete the remote branch as well")
    .action(async (name: string | undefined, opts: { force?: boolean; remote?: boolean }) => {
      const engine = await createEngine(globals());
      const topic = await engine.resolveTarget(undefined, name);
      const result = await engine.deleteBranchType(topic, opts);
      const format = globals().format;
      const data = { branch: result.branch, deletedRemote: result.deletedRemote };
      if (format === "json" || format === "yaml") {
        printStructured(data, format!);
      } else {
        success(`deleted ${result.branch}${result.deletedRemote ? " (local and remote)" : ""}`);
      }
    });
}
