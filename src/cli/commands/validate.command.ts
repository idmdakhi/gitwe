import { Command } from "commander";
import { loadEngine, action, globalOptions } from "./shared.js";
import { print, printStructured, success, style } from "../output.js";

export function validateCommand(): Command {
  return new Command("validate").description("validate the workflow definition").action(
    action(async function (this: Command) {
      const engine = await loadEngine(this);
      const format = globalOptions(this).format;
      const result = engine.validate();

      if (format === "json" || format === "yaml") {
        printStructured(
          {
            valid: result.valid,
            issues: result.issues ?? [],
          },
          format,
          { command: "validate" },
        );
        if (!result.valid) process.exitCode = 1;
        return;
      }

      if (result.valid) {
        success("workflow definition is valid");
        return;
      }

      print(style.red("workflow definition is invalid:"));
      for (const issue of result.issues) {
        print(`  - ${issue.path}: ${issue.message}`);
      }
      process.exitCode = 1;
    }),
  );
}
