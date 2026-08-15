import { Command } from "commander";
import { buildEngineDeps } from "../container.js";
import { globalOptions, action } from "./shared.js";
import { Engine } from "../../application/engine.js";
import { printStructured, success, style, print } from "../output.js";
import type { PresetName } from "../../infrastructure/config/presets.js";

const PRESETS = ["classic", "github", "gitlab"] as const;

export function initCommand(): Command {
  return (
    new Command("init")
      .description("create a gitwe workflow definition in the current repository")
      .option("-f, --force", "overwrite an existing workflow definition")
      .option("-p, --preset <preset>", `workflow preset (${PRESETS.join(", ")})`, "classic")
      // .option("-n, --preset <preset>", `workflow preset (${PRESET_NAMES.join(", ")})`, "classic")
      // .option("-d, --defaults", "accept the preset defaults without prompting")
      // .option("--file <path>", `definition file to write (default: ${DEFAULT_CONFIG_FILE})`)
      // .option("--no-create-branches", "do not create missing base branches")
      // .option(
      //   "-b, --branch <name=value>",
      //   "set a branch name (can be repeated, e.g. --branch main=trunk)",
      //   collect,
      //   [],
      // )
      // .option(
      //   "-p, --prefix <name=value>",
      //   "set a branch type prefix (can be repeated, e.g. --prefix feature=feat/)",
      //   collect,
      //   [],
      // )
      // ===== گزینه‌های عمومی =====
      // .option("-r, --remote <name>", "remote name")
      // ===== گزینه‌های versioning =====
      // .option("--versioning-enabled", "enable versioning (default: false)")
      // .option("--tag-prefix <prefix>", "version tag prefix (default: v)")
      // .option(
      //   "--versioning-path <path>",
      //   "path to versioning config file (default: .gitwe/VERSION.yaml)",
      // )
      // ===== گزینه‌های changelog =====
      // .option("--changelog-enabled", "enable changelog generation (default: false)")
      // .option("--changelog-path <path>", "path to changelog file (default: CHANGELOG.md)")
      .action(
        action(async function (this: Command) {
          const globals = globalOptions(this);
          const opts = this.opts<{ force?: boolean; preset: string }>();
          const preset = opts.preset as PresetName;

          if (!(PRESETS as readonly string[]).includes(preset)) {
            throw Object.assign(new Error(`unknown preset "${preset}"`), {
              // surfaced via generic path if not GitweError
            });
          }

          const deps = buildEngineDeps(globals);
          const engine = await Engine.init(deps, preset, opts.force === true);
          const data = {
            preset,
            path: deps.configRepo.path,
            name: engine.config.name,
            baseBranches: engine.config.baseBranches.map((b) => b.name),
            branchTypes: engine.config.branchTypes.map((t) => t.name),
          };

          if (globals.format === "json" || globals.format === "yaml") {
            printStructured(data, globals.format, { command: "init" });
            return;
          }

          success(`wrote ${deps.configRepo.path}`);
          print(`Workflow ${style.cyan(engine.config.name)} is ready. Try:`);
          const first = engine.config.branchTypes[0]?.name ?? "feature";
          print(`  gitwe start ${first} my-first-${first}`);
          print(`  gitwe overview`);
        }),
      )
  );
}
