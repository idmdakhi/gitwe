import { Command } from "commander";
import { loadEngine, action } from "./shared.js";

export function abortCommand(): Command {
  return new Command("abort")
    .description("abort an in-progress finish operation and restore the previous state")
    .action(
      action(async function (this: Command, out) {
        const engine = await loadEngine(this);
        await engine.abortFinish();

        out.ok({
          data: { aborted: true },
          message: "finish operation aborted",
        });
      }),
    );
}
