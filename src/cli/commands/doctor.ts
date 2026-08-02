import { Command } from "commander";
import { createEngine } from "../context.js";
import type { GlobalOptions } from "../options.js";
import { print, style, printStructured } from "../output.js";

export function registerDoctor(program: Command, globals: () => GlobalOptions): void {
  program
    .command("doctor")
    .description("check repository health and optionally repair issues")
    .option("--fix", "attempt to automatically fix problems")
    .option("--yes", "non-interactive mode for --fix")
    .action(async (options: { fix?: boolean; yes?: boolean }) => {
      const engine = await createEngine(globals());
      // TODO: Replace with engine.doctor() once implemented (RFC-0003)
      // Currently using overview as a temporary solution.
      const report = await engine.overview();
      const issues = report.health.filter((h) => h.level !== "ok");

      const format = globals().format;
      if (format === "json" || format === "yaml") {
        printStructured({ issues, fixed: false }, format);
        return;
      }

      if (issues.length === 0) {
        print(style.green("✓ Repository is healthy."));
        return;
      }

      print(style.bold("Issues found:"));
      for (const issue of issues) {
        const icon = issue.level === "error" ? style.red("✗") : style.yellow("!");
        print(`  ${icon} ${issue.message}`);
      }

      if (options.fix) {
        if (!options.yes) {
          print(style.dim("\n--fix requires --yes to proceed (non-interactive)."));
          print(style.dim("  Use: gitwe doctor --fix --yes"));
          return;
        }
        // TODO: 실제 복구 로직 (Engine.doctor({ fix: true, yes: true }))
        print(style.yellow("\n⚠️  --fix is not yet fully implemented (see RFC-0003)."));
        print(style.dim("  This is a placeholder. Coming soon."));
      }
    });
}
