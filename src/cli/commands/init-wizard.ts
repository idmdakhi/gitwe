import type {
  MergeStrategy,
  WorkflowConfig,
} from "../../domain/entities/workflow-config.entity.js";
import { presets, type PresetName } from "../../domain/config/presets.js";
import { ask, choose, confirm } from "../prompts.js";
import { style, print } from "../output.js";

const PRESET_HELP: Record<PresetName, string> = {
  classic: "Git Flow — main + develop, feature/release/hotfix/support",
  github: "GitHub Flow — single main, short-lived feature/bugfix",
  gitlab: "GitLab Flow — main → staging → production + feature/hotfix",
};

export interface WizardResult {
  readonly config: WorkflowConfig;
  readonly createBranches: boolean;
  readonly preset: PresetName;
}

/**
 * Interactive customisation of a preset into a WorkflowConfig.
 * Always starts from a known-good preset so the result stays valid.
 */
export async function runInitWizard(
  preferredPreset: PresetName = "classic",
): Promise<WizardResult> {
  print("");
  print(style.cyan("gitwe init") + " — interactive workflow setup");
  print("Press Enter to accept the value in [brackets].");
  print("");

  // ---- preset -----------------------------------------------------------
  print("Available presets:");
  for (const name of Object.keys(PRESET_HELP) as PresetName[]) {
    print(`  ${style.bold(name)}  ${PRESET_HELP[name]}`);
  }
  print("");

  const preset = (await choose(
    "Which preset do you want to start from?",
    Object.keys(PRESET_HELP),
    preferredPreset,
  )) as PresetName;

  let config: WorkflowConfig = structuredClone(presets[preset]());

  // ---- name -------------------------------------------------------------
  const name = await ask("Workflow name", config.name);
  config = { ...config, name };

  // ---- base branches (rename) -------------------------------------------
  if (await confirm("Customise base branch names?", false)) {
    const bases: any[] = [];
    for (const base of config.baseBranches) {
      const newName = await ask(`  Base branch "${base.name}" →`, base.name);
      bases.push({ ...base, name: newName });
    }
    const renameMap = new Map(config.baseBranches.map((b, i) => [b.name, bases[i]!.name]));
    const rewritten = bases.map((b) => ({
      ...b,
      ...(b.base && renameMap.has(b.base)
        ? { base: renameMap.get(b.base)! }
        : b.base
          ? { base: b.base }
          : {}),
    }));
    const types = config.branchTypes.map((t) => ({
      ...t,
      base: renameMap.get(t.base) ?? t.base,
      target: t.target.map((x) => renameMap.get(x) ?? x),
    }));
    config = { ...config, baseBranches: rewritten, branchTypes: types };
  }

  // ---- type prefixes ----------------------------------------------------
  if (await confirm("Customise branch-type prefixes?", false)) {
    const types = [];
    for (const t of config.branchTypes) {
      const prefix = await ask(`  Prefix for "${t.name}"`, t.prefix);
      types.push({ ...t, prefix: ensureTrailingSlash(prefix) });
    }
    config = { ...config, branchTypes: types };
  }

  // ---- merge strategy ---------------------------------------------------
  const strategies: MergeStrategy[] = ["merge", "squash", "rebase"];
  const currentStrategy = config.merge?.strategy ?? "merge";
  if (await confirm(`Change default merge strategy (currently ${currentStrategy})?`, false)) {
    const strategy = (await choose(
      "Default merge strategy",
      strategies,
      currentStrategy,
    )) as MergeStrategy;
    config = {
      ...config,
      merge: {
        ...config.merge,
        strategy,
        deleteOnFinish: config.merge?.deleteOnFinish ?? [],
      },
    };
  }

  // ---- remote -----------------------------------------------------------
  const remoteName = await ask("Default remote name", config.remote?.default ?? "origin");
  config = {
    ...config,
    remote: {
      default: remoteName,
      autoFetch: config.remote?.autoFetch ?? true,
      fetch: [remoteName],
      autoPush: config.remote?.autoPush ?? false,
      push: [remoteName],
    },
  };

  // ---- versioning -------------------------------------------------------
  const versioningOn = await confirm(
    "Enable versioning (tags on release/hotfix finish)?",
    config.versioning?.enabled === true,
  );
  if (versioningOn) {
    const tagPrefix = await ask("Tag prefix", config.versioning?.tagPrefix ?? "v");
    config = {
      ...config,
      versioning: {
        enabled: true,
        tagPrefix,
        tagTypes: config.versioning?.tagTypes ?? ["release", "hotfix"],
        bumpRules: config.versioning?.bumpRules ?? {
          minor: ["release"],
          patch: ["hotfix"],
        },
      },
    };
  } else {
    const { versioning: _drop, ...rest } = config;
    config = rest;
  }

  // ---- hooks ------------------------------------------------------------
  const hooksOn = await confirm(
    "Enable local hooks (.gitwe/hooks)?",
    config.hooks?.enabled !== false,
  );
  config = {
    ...config,
    hooks: hooksOn
      ? {
          enabled: true,
          path: config.hooks?.path ?? ".gitwe/hooks",
          config: config.hooks?.config ?? ".gitwe/hooks.yaml",
        }
      : {
          enabled: false,
          path: config.hooks?.path ?? ".gitwe/hooks",
          config: config.hooks?.config ?? ".gitwe/hooks.yaml",
        },
  };

  // ---- create missing bases ---------------------------------------------
  const createBranches = await confirm("Create missing base branches in the repository now?", true);

  // ---- summary ----------------------------------------------------------
  print("");
  print(style.bold("Summary"));
  print(`  preset:        ${preset}`);
  print(`  name:          ${config.name}`);
  print(`  base branches: ${config.baseBranches.map((b) => b.name).join(", ")}`);
  print(`  branch types:  ${config.branchTypes.map((t) => `${t.name} (${t.prefix})`).join(", ")}`);
  print(`  merge:         ${config.merge?.strategy ?? "merge"}`);
  print(`  remote:        ${config.remote?.default ?? "origin"}`);
  print(
    `  versioning:    ${config.versioning?.enabled ? `on (${config.versioning.tagPrefix})` : "off"}`,
  );
  print(`  hooks:         ${config.hooks?.enabled ? "on" : "off"}`);
  print(`  create bases:  ${createBranches ? "yes" : "no"}`);
  print("");

  if (!(await confirm("Write this workflow definition?", true))) {
    throw new Error("init cancelled");
  }

  return { config, createBranches, preset };
}

function ensureTrailingSlash(prefix: string): string {
  if (prefix === "") return prefix;
  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}

/**
 * Apply non-interactive key=value overrides (CLI --branch / --prefix)
 * onto a preset-derived config.
 */
/**
 * Apply non-interactive key=value overrides (CLI --branch / --prefix)
 * onto a preset-derived config.
 */
export function applyInitOverrides(
  config: WorkflowConfig,
  overrides: {
    branchRenames?: Record<string, string> | undefined;
    prefixOverrides?: Record<string, string> | undefined;
    remote?: string | undefined;
  },
): WorkflowConfig {
  let next = config;

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

  if (overrides.prefixOverrides && Object.keys(overrides.prefixOverrides).length > 0) {
    const types = next.branchTypes.map((t) => {
      const p = overrides.prefixOverrides?.[t.name];
      return p !== undefined ? { ...t, prefix: ensureTrailingSlash(p) } : t;
    });
    next = { ...next, branchTypes: types };
  }

  if (overrides.remote) {
    next = {
      ...next,
      remote: {
        default: overrides.remote,
        autoFetch: next.remote?.autoFetch ?? true,
        fetch: [overrides.remote],
        autoPush: next.remote?.autoPush ?? false,
        push: [overrides.remote],
      },
    };
  }

  return next;
}
