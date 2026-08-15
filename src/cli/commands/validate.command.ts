import { Command } from "commander";
import { loadEngine, action } from "./shared.js";

export function validateCommand(): Command {
  return new Command("validate")
    .description("validate the workflow definition")
    .action(
      action(async function (this: Command) {
        const engine = await loadEngine(this);
        const result = engine.validate();
        if (result.valid) {
          console.log("workflow definition is valid");
          return;
        }
        console.error("workflow definition is invalid:");
        for (const issue of result.issues) console.error(`  - ${issue.path}: ${issue.message}`);
        process.exitCode = 1;
      }),
    );
}
