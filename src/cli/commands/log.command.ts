import { Command } from "commander";
import { loadEngine, action } from "./shared.js";

export function logCommand(): Command {
  return new Command("log")
    .description("show git log with workflow context (decorated branch graph)")
    .argument("[args...]", "additional arguments to pass to git log (e.g., --oneline --graph)")
    .action(
      action(async function (this: Command, out, args: string[] = []) {
        const engine = await loadEngine(this);

        // Default args if none provided
        const logArgs =
          args.length > 0
            ? args
            : ["--oneline", "--decorate", "--graph", "--branches", "--remotes"];

        const output = await engine.runGit(["log", ...logArgs]);

        if (!output) {
          out.ok({
            data: { output: "" },
            message: "no commits found",
          });
          return;
        }

        out.ok({
          data: { output },
          details: [output],
        });
      }),
    );
}
