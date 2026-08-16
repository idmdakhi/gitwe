import { Command } from "commander";
import { loadEngine, action } from "./shared.js";
import { style } from "../output.js";

export function validateCommand(): Command {
  return new Command("validate").description("validate the workflow definition").action(
    action(async function (this: Command, out) {
      const engine = await loadEngine(this);
      const result = engine.validate();

      const data = {
        valid: result.valid,
        issues: result.issues ?? [],
      };

      if (result.valid) {
        out.ok({
          data,
          message: "workflow definition is valid",
        });
        return;
      }

      out.ok({
        data,
        message: style.red("workflow definition is invalid:"),
        details: result.issues.map((issue) => `  - ${issue.path}: ${issue.message}`),
      });
      process.exitCode = 1;
    }),
  );
}
