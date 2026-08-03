import { Command } from "commander";
import yaml from "js-yaml";

import { ValidationError } from "../../domain/errors.js";
import { createEngine } from "../context.js";
import type { GlobalOptions } from "../options.js";
import { print, renderTree, style } from "../output.js";
import type { OverviewReport } from "../../application/engine.js";

export function registerOverview(program: Command, globals: () => GlobalOptions): void {
  program
    .command("overview")
    .alias("status")
    .description("show the workflow configuration, branch structure and health")
    // .option("--format <format>", "output format: text, json or yaml", "text")
    .action(async () => {
      const engine = await createEngine(globals());
      const report: OverviewReport = await engine.overview();
      const format = globals().format ?? "text";

      if (format === "json") {
        print(JSON.stringify(report, null, 2));
        return;
      }
      if (format === "yaml") {
        print(yaml.dump(report, { lineWidth: 100, noRefs: true }).trimEnd());
        return;
      }
      if (format === "table") {
        print(
          `${style.bold("Name").padEnd(20)} ${style.bold("Status").padEnd(12)} ${style.bold("Ahead").padEnd(8)} ${style.bold("Behind").padEnd(8)} ${style.bold("Upstream")}`,
        );
        for (const b of report.baseBranches) {
          const status = !b.exists ? "missing" : b.current ? "current" : "ok";
          print(
            `${b.name.padEnd(20)} ${status.padEnd(12)} ${String(b.ahead).padEnd(8)} ${String(b.behind).padEnd(8)} ${b.upstream ?? "-"}`,
          );
        }
        return;
      }
      if (format !== "text") {
        throw new ValidationError(`unknown format "${format}"`, "use text, json, yaml or table");
      }

      print(`${style.bold("Workflow")}  ${report.workflow}`);
      if (report.configPath !== undefined) print(`${style.dim("config")}    ${report.configPath}`);
      print(`${style.dim("remote")}    ${report.remote}`);
      print(`${style.dim("branch")}    ${report.currentBranch ?? "(detached)"}`);
      print();

      print(style.bold("Base branches"));
      const roots = report.baseBranches.filter((b) => b.parent === undefined).map((b) => b.name);
      const lines = renderTree(
        roots,
        (name) => report.baseBranches.filter((b) => b.parent === name).map((b) => b.name),
        (name) => {
          const base = report.baseBranches.find((b) => b.name === name);
          if (base === undefined) return name;
          const marks: string[] = [];
          if (!base.exists) marks.push(style.red("missing"));
          if (base.current) marks.push(style.green("current"));
          if (base.ahead > 0) marks.push(`↑${base.ahead}`);
          if (base.behind > 0) marks.push(`↓${base.behind}`);
          return `${style.cyan(name)}${marks.length > 0 ? ` ${style.dim(`(${marks.join(", ")})`)}` : ""}`;
        },
      );
      for (const line of lines) print(`  ${line}`);
      print();

      print(style.bold("Topic types"));
      for (const type of report.topicTypes) {
        print(
          `  ${style.cyan(type.name.padEnd(10))} ${style.dim(`${type.prefix} → ${type.parent}`)}` +
            `  ${type.branches.length} branch(es)`,
        );
        for (const branch of type.branches) print(`    ${branch}`);
      }
      print();

      print(style.bold("Health"));
      for (const item of report.health) {
        const icon =
          item.level === "ok"
            ? style.green("✓")
            : item.level === "warning"
              ? style.yellow("!")
              : style.red("✗");
        print(`  ${icon} ${item.message}`);
      }
    });
}
