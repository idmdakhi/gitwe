import { Command } from "commander";
import { createEngine } from "../context.js";
import { success, printStructured } from "../output.js";
import type { GlobalOptions } from "../options.js";

export function registerCheckout(program: Command, globals: () => GlobalOptions): void {
  const format = globals().format;
  program
    .command("checkout")
    .description("switch to a topic branch (partial names allowed)")
    .argument("<type>", "topic type (e.g. feature, release)")
    .argument("<name>", "branch name or unique prefix")
    .action(async (type: string, name: string) => {
      const engine = await createEngine(globals());
      const topicType = engine.workflow.requireTopicType(type);
      const branch = await engine.checkout(topicType, name);
      const data = { branch };
      if (format === "json" || format === "yaml") {
        printStructured(data, format!);
      } else {
        success(`switched to ${branch}`);
      }
    });
}
