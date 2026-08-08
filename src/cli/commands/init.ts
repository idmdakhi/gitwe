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
  getAvailablePresets,
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
  branch?: string[];
  prefix?: string[];
  // tag?: string;
  remote?: string;
  versioningEnabled?: boolean;
  tagPrefix?: string;
  versioningPath?: string;
  changelogEnabled?: boolean;
  changelogPath?: string;
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

async function promptYesNo(question: string, fallback: boolean): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${question} (y/n) [${fallback ? "y" : "n"}] `);
    const trimmed = answer.trim().toLowerCase();
    if (trimmed === "" || trimmed === "y" || trimmed === "yes") return true;
    if (trimmed === "n" || trimmed === "no") return false;
    return fallback;
  } finally {
    rl.close();
  }
}

function parseKeyValue(pairs: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of pairs) {
    const [key, ...rest] = pair.split("=");
    if (key && rest.length > 0) {
      result[key.trim()] = rest.join("=").trim();
    }
  }
  return result;
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
    .option("-n, --preset <preset>", `workflow preset (${PRESET_NAMES.join(", ")})`, "classic")
    .option("-d, --defaults", "accept the preset defaults without prompting")
    .option("--file <path>", `definition file to write (default: ${DEFAULT_CONFIG_FILE})`)
    .option("--no-create-branches", "do not create missing base branches")
    .option(
      "-b, --branch <name=value>",
      "set a branch name (can be repeated, e.g. --branch main=trunk)",
      collect,
      [],
    )
    .option(
      "-p, --prefix <name=value>",
      "set a branch type prefix (can be repeated, e.g. --prefix feature=feat/)",
      collect,
      [],
    )
    // ===== گزینه‌های عمومی =====
    .option("-r, --remote <name>", "remote name")
    .option("-tp, --tag-prefix", "version tag prefix", "v")
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
      const dryRun = globalOptions.dryRun === true;
      const format = globalOptions.format;
      // --- برسی وجود فایل تنظیمات ---
      const existing = findConfigFile(root, root);
      if (existing !== undefined && options.force !== true) {
        throw new ConfigError(`${existing} already exists`, "pass --force to overwrite it");
      }

      const availablePresets = getAvailablePresets(root);
      let presetName = options.preset ?? "classic";
      if (!isPresetName(presetName, root)) {
        throw new ConfigError(
          `unknown preset "${presetName}"`,
          `available presets: ${availablePresets.join(", ")}`,
        );
      }
      const branchOverrides = parseKeyValue(options.branch || []);
      const prefixOverrides = parseKeyValue(options.prefix || []);

      // --- جمع‌آوری overrideها از خط فرمان ---
      const cliOverrides: PresetOverrides = {
        remoteName: options.remote,
        tagPrefix: options.tagPrefix,
        // branch overrides - فقط برای branch name‌ها
        ...branchOverrides,
        // prefix overrides
        prefixes: prefixOverrides,
        changelogEnabled: false,
      };

      // --- حالت تعاملی ---
      const interactive =
        options.defaults !== true && process.stdin.isTTY === true && process.stdout.isTTY === true;

      const overrides: PresetOverrides = { ...cliOverrides };

      if (interactive) {
        // ۱. انتخاب preset
        const chosen = await selectFromList(
          "Select workflow preset:",
          availablePresets,
          presetName,
        );
        presetName = chosen as PresetName;

        // ۲. ساخت draft برای preset انتخاب‌شده
        const draft = createPreset(presetName, overrides);

        print(style.bold(`\nConfiguring the "${presetName}" workflow`));

        // ۳. پرسش‌وجو برای base branches
        for (const base of draft.baseBranches) {
          const hasCliOverride = branchOverrides[base.name] !== undefined;
          if (hasCliOverride) continue;

          const answer = await prompt(`Branch name for "${base.name}"?`, base.name);
          // ذخیره در overrides با نام شاخه
          (overrides as any)[base.name] = answer;
        }

        // ۴. پرسش‌وجو برای پیشوندها (یکپارچه)
        if (!overrides.prefixes) overrides.prefixes = {};
        for (const bt of draft.branchTypes) {
          const hasCliOverride = prefixOverrides[bt.name] !== undefined;
          if (hasCliOverride) continue;

          const answer = await prompt(`Prefix for ${bt.name} branches?`, bt.prefix);
          overrides.prefixes[bt.name] = answer;
        }

        // ۵. پرسش‌وجو برای remote و tag prefix
        if (options.remote === undefined) {
          const remoteNameAnswer = await prompt("Remote name?", draft.remote?.name ?? "origin");
          overrides.remoteName = remoteNameAnswer;
        }

        if (options.tagPrefix === undefined) {
          const tagPrefixAnswer = await prompt(
            "Version tag prefix?",
            draft.versioning?.tagPrefix ?? "v",
          );
          overrides.tagPrefix = tagPrefixAnswer;
        }

        // ۶. پرسش‌وجو برای versioning
        if (options.versioningEnabled === undefined) {
          const enabled = await promptYesNo("Enable versioning?", false);
          overrides.versionEnabled = enabled;
        }

        // ۷. پرسش‌وجو برای changelog
        if (options.changelogEnabled === undefined) {
          const enabled = await promptYesNo("Enable changelog generation?", false);
          overrides.changelogEnabled = enabled;
        }

        print();
      }

      // --- ساخت config نهایی با overrideهای نهایی ---
      const config = createPreset(presetName, overrides, root);

      if (overrides.versionEnabled !== undefined || overrides.tagPrefix !== undefined) {
        if (!config.versioning) {
          config.versioning = {
            enabled: false,
            tagPrefix: "v",
            format: "{{tagPrefix}}{{major}}.{{minor}}.{{patch}}",
            tag: [],
            branchTypes: {},
            annotated: true,
            pushTags: false,
            autoCommit: true,
            path: ".gitwe/VERSION.yaml",
            bumpRules: {},
            commitMessage: "chore: bump version to {{version}}",
            initialVersion: "0.1.0",
          };
        }
        if (overrides.versionEnabled !== undefined) {
          config.versioning.enabled = overrides.versionEnabled;
        }
        if (overrides.tagPrefix !== undefined) {
          config.versioning.tagPrefix = overrides.tagPrefix;
        }
        if (options.versioningPath !== undefined) {
          config.versioning.path = options.versioningPath;
        }
      }

      if (overrides.changelogEnabled !== undefined || options.changelogPath !== undefined) {
        if (!config.versioning) {
          config.versioning = {
            enabled: false,
            tagPrefix: "v",
            format: "{{tagPrefix}}{{major}}.{{minor}}.{{patch}}",
            tag: [],
            branchTypes: {},
            annotated: true,
            pushTags: false,
            autoCommit: true,
            path: ".gitwe/VERSION.yaml",
            bumpRules: {},
            commitMessage: "chore: bump version to {{version}}",
            initialVersion: "0.1.0",
          };
        }
        if (!config.versioning.changelog) {
          config.versioning.changelog = {
            enabled: false,
            path: "CHANGELOG.md",
          };
        }
        if (overrides.changelogEnabled !== undefined) {
          config.versioning.changelog.enabled = overrides.changelogEnabled;
        }
        if (options.changelogPath !== undefined) {
          config.versioning.changelog.path = options.changelogPath;
        }
      }

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
        if (config.versioning?.enabled) {
          print(`  gitwe finish <branch>  # version will be bumped automatically`);
        }
      }
    });

  // ===== Helper برای جمع‌آوری گزینه‌های قابل تکرار =====
  function collect(value: string, previous: string[]): string[] {
    return [...previous, value];
  }
}
