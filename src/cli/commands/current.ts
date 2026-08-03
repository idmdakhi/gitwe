import { Command } from "commander";
import { createEngine } from "../context.js";
import type { GlobalOptions } from "../options.js";
import { print, style, printStructured } from "../output.js";

export function registerCurrent(program: Command, globals: () => GlobalOptions): void {
  program
    .command("current")
    .description("show information about the current topic branch")
    .action(async () => {
      const format = globals().format;
      const engine = await createEngine(globals());
      try {
        const topic = await engine.currentTopic();
        const upstream = await engine.git.upstreamOf(topic.branch);
        const data = {
          branch: topic.branch,
          type: topic.type.name,
          parent: topic.type.parent,
          upstream: upstream || undefined,
        };
        if (format === "json" || format === "yaml") {
          printStructured(data, format!);
        } else {
          print(`${style.bold("Branch:")} ${topic.branch}`);
          print(`${style.bold("Type:")}  ${topic.type.name}`);
          print(`${style.bold("Parent:")} ${topic.type.parent}`);
          if (upstream) print(`${style.bold("Upstream:")} ${upstream}`);
        }
      } catch {
        print(style.dim("Not on a topic branch or no workflow defined."));
      }
    });
}
