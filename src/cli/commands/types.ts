import { Command } from "commander";
import { createEngine } from "../context.js";
import type { GlobalOptions } from "../options.js";
import { print, style, printStructured } from "../output.js";

/** Register `gitwe types` — list configured topic types from the workflow definition. */
export function registerTypesCommand(program: Command, globals: () => GlobalOptions): void {
  program
    .command("types")
    .description("list topic types defined in the active workflow")
    .action(async () => {
      const format = globals().format;
      const engine = await createEngine(globals());
      const types = engine.workflow.branchTypes.map((t) => ({
        name: t.name,
        prefix: t.prefix,
        base: t.base,
      }));

      if (format === "json" || format === "yaml") {
        printStructured({ types }, format);
        return;
      }

      if (types.length === 0) {
        print(style.dim("no topic types defined"));
        return;
      }

      for (const t of types) {
        const marks: string[] = [`parent=${t.base}`, `prefix=${t.prefix}`];
        // if (t.tag) marks.push("tag");
        // if (!t.deleteOnFinish) marks.push("keep");
        print(`${style.bold(t.name)}  ${style.dim(marks.join("  "))}`);
      }
    });
}
