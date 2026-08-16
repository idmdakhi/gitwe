import { Command } from "commander";
import { buildEngineDeps } from "../container.js";
import { globalOptions, action } from "./shared.js";
import { Engine } from "../../application/engine.js";
import { printStructured, success, style, print } from "../output.js";
import type { PresetName } from "../../domain/config/presets.js";
import { presets } from "../../domain/config/presets.js";
import type {
  WorkflowConfig,
  VersioningConfig,
  ChangelogConfig,
} from "../../domain/entities/workflow-config.entity.js";
import { runInitWizard, applyInitOverrides } from "./init-wizard.js";
import { isInteractive } from "../prompts.js";
import { omitUndefined, parseKeyValuePairs } from "../../utils.js";

const PRESETS = ["classic", "github", "gitlab"] as const;

// جمع‌آوری مقادیر تکراری از خط فرمان
function collect(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

// اعمال تغییرات روی preset (برای حالت غیرتعاملی)
function applyOverrides(
  config: WorkflowConfig,
  overrides: {
    branchRenames?: Record<string, string> | undefined;
    prefixOverrides?: Record<string, string> | undefined;
    remote?: string | undefined;
    versioningEnabled?: boolean | undefined;
    tagPrefix?: string | undefined;
    versioningPath?: string | undefined;
    changelogEnabled?: boolean | undefined;
    changelogPath?: string | undefined;
  },
): WorkflowConfig {
  let next = config;

  // ---- تغییر نام شاخه‌های پایه ------------------------------------------
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

  // ---- تغییر پیشوند نوع شاخه ------------------------------------------
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

  // ---- تغییر ریموت ----------------------------------------------------
  if (overrides.remote) {
    next = {
      ...next,
      remote: {
        name: overrides.remote,
        autoFetch: next.remote?.autoFetch ?? true,
        fetch: [overrides.remote],
        autoPush: next.remote?.autoPush ?? false,
        push: [overrides.remote],
      },
    };
  }

  // ---- تنظیمات نسخه‌گذاری ---------------------------------------------
  const currentVersioning = next.versioning;
  let newVersioning = currentVersioning;

  if (
    overrides.versioningEnabled !== undefined ||
    overrides.tagPrefix !== undefined ||
    overrides.versioningPath !== undefined
  ) {
    const enabled = overrides.versioningEnabled ?? currentVersioning?.enabled ?? false;
    const tagPrefix = overrides.tagPrefix ?? currentVersioning?.tagPrefix ?? "v";
    const path = overrides.versioningPath ?? currentVersioning?.path;
    const tag = currentVersioning?.tag ?? [];
    const bumpRules = currentVersioning?.bumpRules;

    newVersioning = omitUndefined({
      enabled,
      tagPrefix,
      ...(path !== undefined ? { path } : {}),
      tag,
      ...(bumpRules ? { bumpRules } : {}),
    }) as VersioningConfig;
  }

  if (newVersioning !== currentVersioning) {
    next = omitUndefined({ ...next, versioning: newVersioning }) as WorkflowConfig;
  }

  // ---- تنظیمات Changelog ----------------------------------------------
  const currentChangelog = next.changelog;
  let newChangelog = currentChangelog;

  if (overrides.changelogEnabled !== undefined || overrides.changelogPath !== undefined) {
    const enabled = overrides.changelogEnabled ?? currentChangelog?.enabled ?? false;
    const path = overrides.changelogPath ?? currentChangelog?.path;

    newChangelog = omitUndefined({
      enabled,
      ...(path !== undefined ? { path } : {}),
    }) as ChangelogConfig;
  }

  if (newChangelog !== currentChangelog) {
    next = omitUndefined({ ...next, changelog: newChangelog }) as WorkflowConfig;
  }

  return next;
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
    .option(
      "--versioning-path <path>",
      "path to versioning config file (default: .gitwe/VERSION.yaml)",
    )
    .option("--changelog-enabled", "enable changelog generation")
    .option("--changelog-path <path>", "path to changelog file (default: CHANGELOG.md)")
    .action(
      action(async function (this: Command, out) {
        const globals = globalOptions(this);
        const opts = this.opts<{
          force?: boolean;
          preset: string;
          defaults: boolean;
          file?: string;
          createBranches?: boolean;
          branch: string[];
          prefix: string[];
          remote?: string;
          versioningEnabled?: boolean;
          tagPrefix?: string;
          versioningPath?: string;
          changelogEnabled?: boolean;
          changelogPath?: string;
        }>();

        const presetName = opts.preset as PresetName;
        if (!(PRESETS as readonly string[]).includes(presetName)) {
          throw Object.assign(new Error(`unknown preset "${presetName}"`), {});
        }

        // ---------- تشخیص حالت تعاملی ----------
        const interactive = isInteractive() && !opts.defaults && globals.format === "text";

        let config: WorkflowConfig;
        let createBranches: boolean;

        if (interactive) {
          // ---------- حالت تعاملی (ویزارد) ----------
          const wizardResult = await runInitWizard(opts.preset as PresetName);
          config = wizardResult.config;
          createBranches = wizardResult.createBranches;

          // اعمال گزینه‌های خط فرمان (اولویت با خط فرمان)
          if (opts.branch.length || opts.prefix.length || opts.remote) {
            config = applyInitOverrides(
              config,
              omitUndefined({
                branchRenames: opts.branch.length ? parseKeyValuePairs(opts.branch) : undefined,
                prefixOverrides: opts.prefix.length ? parseKeyValuePairs(opts.prefix) : undefined,
                remote: opts.remote,
              }),
            );
          }
        } else {
          // ---------- حالت غیرتعاملی ----------
          const baseConfig = presets[presetName]();
          config = applyOverrides(baseConfig, {
            branchRenames: opts.branch.length ? parseKeyValuePairs(opts.branch) : undefined,
            prefixOverrides: opts.prefix.length ? parseKeyValuePairs(opts.prefix) : undefined,
            remote: opts.remote,
            versioningEnabled: opts.versioningEnabled,
            tagPrefix: opts.tagPrefix,
            versioningPath: opts.versioningPath,
            changelogEnabled: opts.changelogEnabled,
            changelogPath: opts.changelogPath,
          });
          createBranches = opts.createBranches !== false;
        }

        // ---------- ساخت deps و اجرای Engine.init ----------
        const deps = buildEngineDeps({
          ...globals,
          ...(opts.file ? { config: opts.file } : {}),
        });

        const engine = await Engine.init(deps, {
          config,
          force: opts.force === true,
          createBranches,
        });

        // ---------- نمایش خروجی ----------
        const data = {
          preset: presetName,
          path: deps.configRepo.path,
          name: engine.config.name,
          baseBranches: engine.config.baseBranches.map((b) => b.name),
          branchTypes: engine.config.branchTypes.map((t) => t.name),
        };

        // استفاده از out.ok به جای success و print مستقیم
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
