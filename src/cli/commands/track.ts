import { Command } from "commander";
import { createEngine } from "../context.js";
import type { GlobalOptions } from "../options.js";
import { success, printStructured } from "../output.js";

export function registerTrack(program: Command, globals: () => GlobalOptions): void {
  const format = globals().format;
  program
    .command("track")
    .description("create a local topic branch tracking the remote one")
    .argument("<type>", "topic type")
    .argument("<name>", "branch name")
    .action(async (type: string, name: string) => {
      const engine = await createEngine(globals());
      const branch = await engine.track(type, name);
      const data = { branch };
      if (format === "json" || format === "yaml") {
        printStructured(data, format!);
      } else {
        success(`tracking ${branch}`);
      }
    });
}
