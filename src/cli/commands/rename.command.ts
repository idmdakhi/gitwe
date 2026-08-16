import { Command } from "commander";
import { loadEngine, action } from "./shared.js";

export function renameCommand(): Command {
  return new Command("rename")
    .description("rename the current topic branch (keeps the type prefix)")
    .argument("<new-name>", "new short name, e.g. auth  →  feature/auth")
    .action(
      action(async function (this: Command, out, newName: string) {
        const engine = await loadEngine(this);
        const result = await engine.rename(newName);

        out.ok({
          data: result,
          message: `renamed ${result.from} → ${result.to}`,
        });
      }),
    );
}
