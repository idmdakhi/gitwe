import { Command } from "commander";
import { loadEngine, action, globalOptions } from "./shared.js";
import { print, printStructured, style } from "../output.js";

export function typesCommand(): Command {
  return new Command("types").description("list topic types defined in the active workflow").action(
    action(async function (this: Command) {
      const engine = await loadEngine(this);
      const format = globalOptions(this).format;
      const types = engine.workflow.branchTypes.map((t) => ({
        name: t.name,
        prefix: t.prefix,
        base: t.base,
        target: [...t.target],
        aliases: t.aliases ? [...t.aliases] : [],
      }));

      if (format === "json" || format === "yaml") {
        printStructured({ types }, format, { command: "types" });
        return;
      }

      if (types.length === 0) {
        print(style.dim("no topic types defined"));
        return;
      }

      for (const t of types) {
        print(
          `${style.bold(t.name)}  ${style.dim(
            `prefix=${t.prefix}  base=${t.base}  target=[${t.target.join(", ")}]`,
          )}`,
        );
      }
    }),
  );
}
