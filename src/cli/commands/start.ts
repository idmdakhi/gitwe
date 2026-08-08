import { Command } from "commander";
import { createEngine } from "../context.js";
import { success, printStructured } from "../output.js";
import type { GlobalOptions } from "../options.js";

export function registerStart(program: Command, globals: () => GlobalOptions): void {
  program
    .command("start")
    .description("create a new topic branch")
    .argument("<type>", "topic type (e.g. feature, release)")
    .argument("<name>", "short name of the branch")
    .argument("[base]", "start point (branch, tag or commit)")
    .option("--fetch", "fetch the remote before creating the branch")
    .action(
      async (
        typeName: string,
        name: string,
        base: string | undefined,
        opts: { fetch?: boolean },
      ) => {
        const engine = await createEngine(globals());
        const result = await engine.start(typeName, name, { base, fetch: opts.fetch });
        const format = globals().format;
        const data = { branch: result.branch, startPoint: result.startPoint };
        if (format === "json" || format === "yaml") {
          printStructured(data, format!);
        } else {
          success(`created ${result.branch} from ${result.startPoint}`);
        }
      },
    );
}
