import { Command } from "commander";
import { buildEngineDeps } from "../container.js";
import { globalOptions, action } from "./shared.js";
import { Engine } from "../../application/engine.js";
import { style } from "../output.js";
import { presets, type PresetName } from "../../domain/config/presets.js";
import type { WorkflowConfig } from "../../domain/entities/workflow-config.entity.js";
import { runInitWizard } from "./init-wizard.js";
import { isInteractive } from "../prompts.js";
import { omitUndefined, parseKeyValuePairs } from "../../utils.js";

const PRESETS = ["classic", "github", "gitlab"] as const;

// جمع‌آوری مقادیر تکراری از خط فرمان
function collect(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

// اعمال تغییرات ساده روی preset (بدون بخش‌های اضافی)
function applyOverrides(
  config: WorkflowConfig,
  overrides: {
    branchRenames?: Record<string, string> | undefined;
    prefixOverrides?: Record<string, string> | undefined;
    remote?: string | undefined;
    versioningEnabled?: boolean | undefined;
    tagPrefix?: string | undefined;
  },
): WorkflowConfig {
  let next = config;

  // ---- تغییر نام شاخه‌های پایه ----
  if (overrides.branchRenames && Object.keys(overrides.branchRenames).length > 0) {
    const renameMap = new Map(Object.entries(overrides.branchRenames));
    const bases = next.baseBranches.map((b) => ({
      ...b,
      name: renameMap.get(b.name) ?? b.name,
      ...(b.base ? { base: renameMap.get(b.base) ?? b.base } : {}),
    }));
    const types = next.branchTypes.map((t) => ({
      ...t,
      base: renameMap.get(t.base) ?? t.base,
      target: t.target.map((x) => renameMap.get(x) ?? x),
    }));
    next = { ...next, baseBranches: bases, branchTypes: types };
  }

  // ---- تغییر پیشوند نوع شاخه ----
  if (overrides.prefixOverrides && Object.keys(overrides.prefixOverrides).length > 0) {
    const types = next.branchTypes.map((t) => {
      const p = overrides.prefixOverrides?.[t.name];
      if (p !== undefined) {
        const prefix = p.endsWith("/") ? p : `${p}/`;
        return { ...t, prefix };
      }
      return t;
    });
    next = { ...next, branchTypes: types };
  }

  // ---- تغییر ریموت ----
  if (overrides.remote) {
    next = {
      ...next,
      remote: {
        default: overrides.remote,
        autoFetch: true,
        fetch: [overrides.remote],
        autoPush: false,
        push: [overrides.remote],
      },
    };
  }

  // ---- تنظیمات نسخه‌گذاری ----
  if (overrides.versioningEnabled !== undefined || overrides.tagPrefix !== undefined) {
    const enabled = overrides.versioningEnabled ?? next.versioning?.enabled ?? false;
    const tagPrefix = overrides.tagPrefix ?? next.versioning?.tagPrefix ?? "v";
    const current = next.versioning ?? { enabled: false, tagPrefix: "v" };
    next = {
      ...next,
      versioning: {
        ...current,
        enabled,
        tagPrefix,
        tagTypes: current.tagTypes ?? ["release", "hotfix"],
        tagTargets: current.tagTargets ?? ["root"],
        bumpRules: current.bumpRules ?? {
          minor: ["release"],
          patch: ["hotfix"],
        },
      },
    };
  }

  // حذف بخش‌های اضافی (hooks, changelog, cli) در صورت وجود
  const { hooks, changelog, cli, ...cleanConfig } = next as any;
  return cleanConfig as WorkflowConfig;
}

export function initCommand(): Command {
  return new Command("init")
    .description("create a gitwe workflow definition in the current repository")
    .option("-f, --force", "overwrite an existing workflow definition")
    .option("-p, --preset <preset>", `workflow preset (${PRESETS.join(", ")})`, "classic")
    .option("-d, --defaults", "accept the preset defaults without prompting (skip interactive)")
    .option("--file <path>", "definition file to write (default: .gitwe/gitwe.yaml)")
    .option("--no-create-branches", "do not create missing base branches")
    .option(
      "-b, --branch <name=value>",
      "rename a base branch (can be repeated, e.g. --branch main=trunk)",
      collect,
      [],
    )
    .option(
      "--prefix <name=value>",
      "override a branch type prefix (can be repeated, e.g. --prefix feature=feat/)",
      collect,
      [],
    )
    .option("-r, --remote <name>", "default remote name")
    .option("--versioning-enabled", "enable versioning (tags on release/hotfix)")
    .option("--tag-prefix <prefix>", "version tag prefix (default: v)")
    .action(
      action(async function (this: Command, out) {
        const globals = globalOptions(this);
        const opts = this.opts<{
          force?: boolean;
          preset: string;
          defaults: boolean;
          path?: string;
          createBranches?: boolean;
          branch: string[];
          prefix: string[];
          remote?: string;
          versioningEnabled?: boolean;
          tagPrefix?: string;
        }>();

        const presetName = opts.preset as PresetName;
        if (!(PRESETS as readonly string[]).includes(presetName)) {
          throw Object.assign(new Error(`unknown preset "${presetName}"`), {});
        }

        // تشخیص حالت تعاملی
        const interactive = isInteractive() && !opts.defaults && globals.format === "text";

        let config: WorkflowConfig;
        let createBranches: boolean;

        if (interactive) {
          // حالت تعاملی (ویزارد ساده)
          const wizardResult = await runInitWizard(opts.preset as PresetName);
          config = wizardResult.config;
          createBranches = wizardResult.createBranches;

          // اعمال گزینه‌های خط فرمان (اولویت با خط فرمان)
          if (opts.branch.length || opts.prefix.length || opts.remote) {
            const overrides: any = {
              branchRenames: opts.branch.length ? parseKeyValuePairs(opts.branch) : undefined,
              prefixOverrides: opts.prefix.length ? parseKeyValuePairs(opts.prefix) : undefined,
              remote: opts.remote,
            };
            config = applyOverrides(config, omitUndefined(overrides));
          }
        } else {
          // حالت غیرتعاملی
          const baseConfig = presets[presetName]();
          config = applyOverrides(baseConfig, {
            branchRenames: opts.branch.length ? parseKeyValuePairs(opts.branch) : undefined,
            prefixOverrides: opts.prefix.length ? parseKeyValuePairs(opts.prefix) : undefined,
            remote: opts.remote,
            versioningEnabled: opts.versioningEnabled,
            tagPrefix: opts.tagPrefix,
          });
          createBranches = opts.createBranches !== false;
        }

        // ساخت deps و اجرای Engine.init
        const deps = buildEngineDeps({
          ...globals,
          ...(opts.path ? { config: opts.path } : {}),
        });

        const engine = await Engine.init(deps, {
          config,
          force: opts.force === true,
          createBranches,
        });

        // نمایش خروجی
        const data = {
          preset: presetName,
          path: deps.configRepo.path,
          name: engine.config.name,
          baseBranches: engine.config.baseBranches.map((b) => b.name),
          branchTypes: engine.config.branchTypes.map((t) => t.name),
        };

        const first = engine.config.branchTypes[0]?.name ?? "feature";
        out.ok({
          data,
          message: `wrote ${deps.configRepo.path}`,
          details: [
            `Workflow ${style.cyan(engine.config.name)} is ready. Try:`,
            `  gitwe start ${first} my-first-${first}`,
            `  gitwe overview`,
          ],
        });
      }),
    );
}
