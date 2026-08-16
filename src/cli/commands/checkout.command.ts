import { Command } from "commander";
import { loadEngine, action } from "./shared.js";

export function checkoutCommand(): Command {
  return new Command("checkout")
    .description("switch to a topic branch (partial short names allowed)")
    .argument("<type>", "topic type (e.g. feature, release)")
    .argument("<name>", "short name or unique prefix (e.g. login or log)")
    .action(
      action(async function (this: Command, out, type: string, name: string) {
        const engine = await loadEngine(this);
        const result = await engine.checkout(type, name);

        out.ok({
          data: result,
          message: `switched to "${result.branch}"`,
        });
      }),
    );
}
