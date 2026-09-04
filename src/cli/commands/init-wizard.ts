import type { WorkflowConfig } from "../../domain/entities/workflow-config.entity.js";
import { presets, type PresetName } from "../../domain/config/presets.js";
import { ask, confirm } from "../prompts.js";
import { style, print } from "../output.js";

export interface WizardResult {
  readonly config: WorkflowConfig;
  readonly createBranches: boolean;
  readonly preset: PresetName;
}

/**
 * ویزارد ساده برای ایجاد workflow
 * فقط سوالات ضروری را می‌پرسد و preset کلاسیک را با تنظیمات پایه تولید می‌کند.
 */
export async function runInitWizard(
  preferredPreset: PresetName = "classic",
): Promise<WizardResult> {
  print("");
  print(style.cyan("gitwe init") + " — interactive workflow setup");
  print("Press Enter to accept the value in [brackets].");
  print("");

  const preset = preferredPreset;
  let config: WorkflowConfig = structuredClone(presets[preset]());

  // حذف بخش‌های اضافی (hooks, changelog, cli) برای سادگی
  const { hooks: _hooks, changelog: _changelog, cli: _cli, ...baseConfig } = config as any;
  config = baseConfig as WorkflowConfig;

  // ---- نام workflow ----
  const name = await ask("Workflow name", config.name);
  config = { ...config, name };

  // ---- remote ----
  const remoteName = await ask("Default remote name", config.remote?.default ?? "origin");
  config = {
    ...config,
    remote: {
      default: remoteName,
      autoFetch: true,
      fetch: [remoteName],
      autoPush: false,
      push: [remoteName],
    },
  };

  // ---- versioning ----
  const versioningOn = await confirm("Enable versioning (tags on release/hotfix finish)?", true);
  if (versioningOn) {
    const tagPrefix = await ask("Tag prefix", "v");
    config = {
      ...config,
      versioning: {
        enabled: true,
        tagPrefix,
        tagTypes: ["release", "hotfix"],
        tagTargets: ["root"],
        bumpRules: {
          minor: ["release"],
          patch: ["hotfix"],
        },
      },
    };
  } else {
    const { versioning: _versioning, ...rest } = config;
    config = rest as WorkflowConfig;
  }

  // ---- ایجاد شاخه‌های پایه ----
  const createBranches = await confirm("Create missing base branches in the repository now?", true);

  // ---- خلاصه ----
  print("");
  print(style.bold("Summary"));
  print(`  name:          ${config.name}`);
  print(`  base branches: ${config.baseBranches.map((b) => b.name).join(", ")}`);
  print(`  branch types:  ${config.branchTypes.map((t) => t.name).join(", ")}`);
  print(`  remote:        ${config.remote?.default ?? "origin"}`);
  print(`  versioning:    ${config.versioning?.enabled ? "on" : "off"}`);
  print(`  create bases:  ${createBranches ? "yes" : "no"}`);
  print("");

  if (!(await confirm("Write this workflow definition?", true))) {
    throw new Error("init cancelled");
  }

  return { config, createBranches, preset };
}
