import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { Command } from "commander";
import { resolvePath } from "../../application/path-resolver.js";

import { ConfigError, GitweError } from "../../domain/errors.js";
import {
  DEFAULT_CONFIG_FILE,
  findConfigFile,
  writeConfigFile,
} from "../../infrastructure/config/loader.js";
import {
  createPreset,
  isPresetName,
  PRESET_NAMES,
  type PresetName,
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

/**
 * نمایش لیست گزینه‌ها و دریافت انتخاب کاربر
 * @param question سوالی که پرسیده می‌شود
 * @param options آرایه‌ای از گزینه‌ها (مثلاً ['classic', 'github', 'gitlab'])
 * @param defaultOption گزینه پیش‌فرض
 * @returns گزینه انتخاب‌شده
 */
async function selectFromList(
  question: string,
  options: string[],
  defaultOption: string,
): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    print();
    print(style.bold(question));
    for (let i = 0; i < options.length; i++) {
      const label = options[i] === defaultOption ? `${style.green("●")}` : "○";
      print(`  ${label} ${i + 1}) ${options[i]}`);
    }
    const promptText = `Enter number or name [${defaultOption}]: `;
    const answer = await rl.question(promptText);
    const trimmed = answer.trim();
    if (trimmed === "") return defaultOption;
    const num = Number.parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 1 && num <= options.length) {
      return options[num - 1];
    }
    const matched = options.find((opt) => opt.toLowerCase() === trimmed.toLowerCase());
    if (matched !== undefined) return matched;
    print(style.yellow(`"${trimmed}" is not a valid option. Using default "${defaultOption}".`));
    return defaultOption;
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
    .option("-r, --release <prefix>", "release branch prefix")
    .option("-x, --hotfix <prefix>", "hotfix branch prefix")
    .option("-s, --support <prefix>", "support branch prefix")
    .option("-t, --tag <prefix>", "version tag prefix")
    .option("--remote <name>", "remote name")
    .action(async (options: InitOptions) => {
      const globalOptions = globals();
      const cwd = globalOptions.cwd ?? process.cwd();
      // ===== بررسی وجود مخزن Git =====
      let root: string;
      try {
        root = await repositoryRoot(cwd);
        // ادامهٔ کار
      } catch (error) {
        if (error instanceof GitweError && error.code === "NOT_A_REPOSITORY") {
          console.error(style.red(`✗ ${error.message}`));
          console.error(style.dim(`  ${error.hint}`));
          process.exitCode = 1;
          return;
        }
        throw error;
      }
      root = await repositoryRoot(cwd);
      const dryRun = globalOptions.dryRun === true;
      const format = globalOptions.format;

      // --- برسی وجود فایل تنظیمات ---
      const existing = findConfigFile(root, root);
      if (existing !== undefined && options.force !== true) {
        throw new ConfigError(`${existing} already exists`, "pass --force to overwrite it");
      }

      // --- تعیین preset (از خط فرمان یا تعاملی) ---
      let presetName: PresetName = (options.preset ?? "classic") as PresetName;
      if (!isPresetName(presetName)) {
        throw new ConfigError(
          `unknown preset "${presetName}"`,
          `available presets: ${PRESET_NAMES.join(", ")}`,
        );
      }

      // --- جمع‌آوری overrideها از خط فرمان ---
      const cliOverrides: PresetOverrides = {
        main: options.main,
        develop: options.develop,
        production: options.production,
        staging: options.staging,
        tagPrefix: options.tag,
        remoteName: options.remote,
        prefixes: {
          ...(options.feature !== undefined ? { feature: options.feature } : {}),
          ...(options.release !== undefined ? { release: options.release } : {}),
          ...(options.hotfix !== undefined ? { hotfix: options.hotfix } : {}),
          ...(options.support !== undefined ? { support: options.support } : {}),
        },
      };

      // --- حالت تعاملی ---
      const interactive =
        options.defaults !== true && process.stdin.isTTY === true && process.stdout.isTTY === true;

      const overrides: PresetOverrides = { ...cliOverrides };

      if (interactive) {
        // ۱. انتخاب preset
        const chosen = await selectFromList("Select workflow preset:", PRESET_NAMES, presetName);
        presetName = chosen as PresetName;

        // ۲. ساخت draft برای preset انتخاب‌شده
        const draft = createPreset(presetName, overrides);

        print(style.bold(`\nConfiguring the "${presetName}" workflow`));

        // ۳. پرسش‌وجو برای base branches
        for (const base of draft.baseBranches) {
          // بررسی override از خط فرمان
          const hasCliOverride =
            (base.name === "main" && options.main !== undefined) ||
            (base.name === "develop" && options.develop !== undefined) ||
            (base.name === "staging" && options.staging !== undefined) ||
            (base.name === "production" && options.production !== undefined);

          if (hasCliOverride) continue;

          const answer = await prompt(`Base branch name for "${base.name}"?`, base.name);
          if (base.name === draft.baseBranches[0].name) overrides.main = answer;
          else if (base.name === "develop") overrides.develop = answer;
          else if (base.name === "staging") overrides.staging = answer;
          else if (base.name === "production") overrides.production = answer;
        }

        // ۴. پرسش‌وجو برای branch types
        // ابتدا overrides.prefixes, overrides.bases, overrides.targets را مقداردهی اولیه می‌کنیم
        if (!overrides.prefixes) overrides.prefixes = {};
        if (!overrides.bases) overrides.bases = {};
        if (!overrides.targets) overrides.targets = {};

        for (const bt of draft.branchTypes) {
          // بررسی override از خط فرمان (برای prefix)
          const hasCliOverride = options[bt.name as keyof InitOptions] !== undefined;

          // سوال برای base (مبدأ)
          const baseAnswer = await prompt(
            `Base branch for "${bt.name}" branches? (where they start from)`,
            bt.base,
          );
          overrides.bases[bt.name] = baseAnswer;

          // سوال برای target (هدف) – می‌تواند آرایه باشد
          const targetAnswer = await prompt(
            `Target branch(es) for "${bt.name}" branches? (comma-separated)`,
            bt.target.join(","),
          );
          overrides.targets[bt.name] = targetAnswer;

          // سوال برای prefix (فقط اگر از خط فرمان نیامده باشد)
          if (!hasCliOverride) {
            const prefixAnswer = await prompt(`Prefix for ${bt.name} branches?`, bt.prefix);
            overrides.prefixes[bt.name] = prefixAnswer;
          }
        }

        // ۵. پرسش‌وجو برای tag prefix (اگر از خط فرمان نیامده باشد)
        if (options.tag === undefined) {
          overrides.tagPrefix = await prompt(
            "Version tag prefix?",
            draft.versioning?.tagPrefix ?? "v",
          );
        }

        // ۶. پرسش‌وجو برای remote (اگر از خط فرمان نیامده باشد)
        if (options.remote === undefined) {
          const remoteNameAnswer = await prompt("Remote name?", draft.remote?.name ?? "origin");
          overrides.remoteName = remoteNameAnswer;
        }

        print(); // یک خط خالی
      }

      // --- ساخت config نهایی با overrideهای نهایی ---
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
            preset: presetName,
            path,
            config,
            branchesCreated: options.createBranches !== false ? [] : undefined,
          },
          format,
        );
        if (dryRun) return;
      }

      // --- نوشتن فایل ---
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
        const firstTopic = config.branchTypes[0]?.name ?? "feature";
        print(`  gitwe start ${firstTopic} my-first-${firstTopic}`);
        print(`  gitwe overview`);
      }
    });
}
