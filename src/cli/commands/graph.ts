import { Command } from "commander";
import { createEngine } from "../context.js";
import type { GlobalOptions } from "../options.js";
import { print, renderTree, style, printStructured } from "../output.js";
import type { OverviewReport } from "../../application/engine.js";

export function registerGraph(program: Command, globals: () => GlobalOptions): void {
  program
    .command("graph")
    .description("show branch graph (base branches and topics)")
    .option("--root <branch>", "root branch to display from", "main")
    .action(async (
      // options: { root?: string }
    ) => {
      const engine = await createEngine(globals());
      const report: OverviewReport = await engine.overview();
      const format = globals().format;

      // Prepare data for structured output
      const data = {
        baseBranches: report.baseBranches.map((b) => ({
          name: b.name,
          base: b.base || null,
          exists: b.exists,
          current: b.current,
          ahead: b.ahead,
          behind: b.behind,
          upstream: b.upstream || null,
        })),
        branchTypes: report.branchTypes.map((t) => ({
          name: t.name,
          prefix: t.prefix,
          base: t.base,
          branches: t.branches,
        })),
      };

      if (format === "json" || format === "yaml") {
        printStructured(data, format);
        return;
      }

      // نمایش درخت base branches
      print(style.bold("Base branches:"));
      const roots = report.baseBranches.filter((b) => b.base === undefined).map((b) => b.name);
      const lines = renderTree(
        roots,
        (name) => report.baseBranches.filter((b) => b.base === name).map((b) => b.name),
        (name) => {
          const base = report.baseBranches.find((b) => b.name === name);
          if (!base) return name;
          const marks = [];
          if (!base.exists) marks.push(style.red("missing"));
          if (base.current) marks.push(style.green("current"));
          if (base.ahead > 0) marks.push(`↑${base.ahead}`);
          if (base.behind > 0) marks.push(`↓${base.behind}`);
          return `${style.cyan(name)}${marks.length ? ` ${style.dim(`(${marks.join(", ")})`)}` : ""}`;
        },
      );
      for (const line of lines) print(`  ${line}`);

      // نمایش topic branches
      print(`\n${style.bold("Topic branches:")}`);
      for (const type of report.branchTypes) {
        if (type.branches.length === 0) continue;
        print(`  ${style.cyan(type.name)} (${type.prefix} → ${type.base})`);
        for (const branch of type.branches) {
          print(`    ${branch}`);
        }
      }
    });
}
