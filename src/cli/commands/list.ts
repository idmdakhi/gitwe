import { Command } from "commander";
import { createEngine } from "../context.js";
import type { GlobalOptions } from "../options.js";
import { print, style, printStructured } from "../output.js";

export function registerList(program: Command, globals: () => GlobalOptions): void {
  program
    .command("list")
    .description("list topic branches of a given type")
    .argument("<type>", "topic type")
    .argument("[pattern]", "shell-style glob applied to the short name")
    .action(async (type: string, pattern: string | undefined) => {
      const format = globals().format;
      const engine = await createEngine(globals());
      const topicType = engine.workflow.requireTopicType(type);
      const branches = await engine.listTopics(topicType, pattern);
      if (format === "json" || format === "yaml") {
        printStructured({ type, branches }, format!);
        return;
      }
      if (branches.length === 0) {
        print(style.dim(`no ${type} branches`));
        return;
      }
      for (const branch of branches) {
        const marks: string[] = [];
        if (branch.ahead > 0) marks.push(`↑${branch.ahead}`);
        if (branch.behind > 0) marks.push(`↓${branch.behind}`);
        if (branch.upstream !== undefined) marks.push(branch.upstream);
        print(
          `${branch.current ? style.green("* ") : "  "}${branch.name}` +
            (marks.length > 0 ? ` ${style.dim(`(${marks.join(", ")})`)}` : ""),
        );
      }
    });
}
