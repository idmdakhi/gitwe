import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
// import { join } from "node:path";
import { Command } from "commander";
import { resolvePath } from "../../application/path-resolver.js";

import { ConfigError } from "../../domain/errors.js";
import {
  DEFAULT_CONFIG_FILE,
  findConfigFile,
  writeConfigFile,
} from "../../infrastructure/config/loader.js";
import {
  createPreset,
  isPresetName,
  PRESET_NAMES,
  type PresetOverrides,
} from "../../domain/config/presets.js";
import { createConsoleLogger } from "../../infrastructure/logger/console-logger.js";
import { createEngine as wireEngine } from "../../di/create-engine.js";
import { print, style, success, printStructured } from "../output.js";
import { repositoryRoot } from "../context.js";
import type { GlobalOptions } from "../options.js";

interface InitOptions {
  force?: boolean;
  preset?: string;
  defaults?: boolean;
  file?: string;
  createBranches?: boolean;
  main?: string;
  develop?: string;
  production?: string;
  staging?: string;
  feature?: string;
  bugfix?: string;
  release?: string;
  hotfix?: string;
  support?: string;
  tag?: string;
  remote?: string;
}

async function prompt(question: string, fallback: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${question} [${fallback}] `);
    return answer.trim() === "" ? fallback : answer.trim();
  } finally {
    rl.close();
  }
}

export function registerInit(program: Command, globals: () => GlobalOptions): void {
  program
    .command("init")
    .description("create a gitwe workflow definition in the current repository")
    .option("-f, --force", "overwrite an existing workflow definition")
    .option("-p, --preset <preset>", `workflow preset (${PRESET_NAMES.join(", ")})`, "classic")
    .option("-d, --defaults", "accept the preset defaults without prompting")
    .option("--file <path>", `definition file to write (default: ${DEFAULT_CONFIG_FILE})`)
    .option("--no-create-branches", "do not create missing base branches")
    .option("-m, --main <name>", "main branch name")
    .option("--develop <name>", "develop branch name")
    .option("--production <name>", "production branch name (gitlab preset)")
    .option("--staging <name>", "staging branch name (gitlab preset)")
    .option("--feature <prefix>", "feature branch prefix")
    .option("-b, --bugfix <prefix>", "bugfix branch prefix")
    .option("-r, --release <prefix>", "release branch prefix")
    .option("-x, --hotfix <prefix>", "hotfix branch prefix")
    .option("-s, --support <prefix>", "support branch prefix")
    .option("-t, --tag <prefix>", "version tag prefix")
    .option("--remote <name>", "remote name")
    .action(async (options: InitOptions) => {
      const globalOptions = globals();
      const cwd = globalOptions.cwd ?? process.cwd();
      const root = await repositoryRoot(cwd);
      const dryRun = globalOptions.dryRun === true;
      const format = globalOptions.format;

      // --- برسی وجود فایل تنظیمات ---
      const existing = findConfigFile(root, root);
      if (existing !== undefined && options.force !== true) {
        throw new ConfigError(`${existing} already exists`, "pass --force to overwrite it");
      }

      // --- تعیین preset ---
      const presetName = options.preset ?? "classic";
      if (!isPresetName(presetName)) {
        throw new ConfigError(
          `unknown preset "${presetName}"`,
          `available presets: ${PRESET_NAMES.join(", ")}`,
        );
      }

      // --- جمع‌آوری overrideها ---
      const overrides: PresetOverrides = {
        main: options.main,
        develop: options.develop,
        production: options.production,
        staging: options.staging,
        tagPrefix: options.tag,
        remote: options.remote,
        prefixes: {
          ...(options.feature !== undefined ? { feature: options.feature } : {}),
          ...(options.bugfix !== undefined ? { bugfix: options.bugfix } : {}),
          ...(options.release !== undefined ? { release: options.release } : {}),
          ...(options.hotfix !== undefined ? { hotfix: options.hotfix } : {}),
          ...(options.support !== undefined ? { support: options.support } : {}),
        },
      };

      // --- حالت تعاملی ---
      const interactive =
        options.defaults !== true && process.stdin.isTTY === true && process.stdout.isTTY === true;
      if (interactive) {
        const draft = createPreset(presetName, overrides);
        print(style.bold(`Configuring the "${presetName}" workflow`));
        for (const base of draft.baseBranches) {
          const answer = await prompt(`Base branch name for "${base.name}"?`, base.name);
          if (base.name === draft.baseBranches[0].name) overrides.main = answer;
          else if (base.name === "develop") overrides.develop = answer;
          else if (base.name === "staging") overrides.staging = answer;
          else if (base.name === "production") overrides.production = answer;
        }
        for (const topic of draft.topicTypes) {
          const answer = await prompt(`Prefix for ${topic.name} branches?`, topic.prefix);
          overrides.prefixes = { ...overrides.prefixes, [topic.name]: answer };
        }
        overrides.tagPrefix = await prompt("Version tag prefix?", draft.tagPrefix);
      }

      // --- ساخت config نهایی ---
      const config = createPreset(presetName, overrides);
      const target = options.file
        ? resolvePath(root, options.file)
        : resolvePath(root, DEFAULT_CONFIG_FILE);
      const path = existsSync(target) || target.includes("/") ? target : resolvePath(root, target);

      // --- خروجی JSON/YAML اگر درخواست شده باشد ---
      if (format === "json" || format === "yaml") {
        printStructured(
          {
            action: dryRun ? "dry-run" : "write",
            path,
            config,
            branchesCreated: options.createBranches !== false ? [] : undefined,
          },
          format,
        );
        if (dryRun) return;
      }

      // --- نوشتن فایل (اگر dry-run نباشد) ---
      if (!dryRun) {
        writeConfigFile(path, config);
        success(`wrote ${path}`);
      } else {
        print(style.dim(`[dry-run] would write to ${path}`));
      }

      // --- ایجاد شاخه‌های پایه ---
      if (options.createBranches !== false && !dryRun) {
        const logger = createConsoleLogger(globalOptions.verbose === true);
        const engine = await wireEngine({
          root,
          config,
          configPath: path,
          logger,
        });
        const created = await engine.createMissingBaseBranches();
        for (const branch of created) success(`created branch ${branch}`);
      } else if (options.createBranches !== false && dryRun) {
        print(style.dim("[dry-run] would create missing base branches"));
      }

      if (!dryRun) {
        print();
        print(`Workflow ${style.cyan(config.name)} is ready. Try:`);
        const firstTopic = config.topicTypes[0]?.name ?? "feature";
        print(`  gitwe start ${firstTopic} my-first-${firstTopic}`);
        print(`  gitwe overview`);
      }
    });
}
