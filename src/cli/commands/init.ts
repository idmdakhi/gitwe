import type { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import { dump as yaml_dump } from "js-yaml";

type ConfigTemplate = Record<string, unknown>;

const CONFIG_TEMPLATES: Record<string, ConfigTemplate> = {
  "git-flow": {
    version: 1,
    workflow: "git-flow",
    branches: { main: { protected: true }, develop: { protected: true } },
    types: {
      feature: { prefix: "feature/", base: "develop", target: "develop", deleteAfterFinish: true },
      release: { prefix: "release/", base: "develop", target: ["main", "develop"], tag: true },
      hotfix: { prefix: "hotfix/", base: "main", target: ["main", "develop"] },
    },
    merge: { strategy: "merge", deleteSource: true },
    tag: { enabled: true, prefix: "v" },
    commit: { conventional: { enabled: false } },
    branchNaming: { case: "kebab-case", maxLength: 80 },
  },
  "github-flow": {
    version: 1,
    workflow: "github-flow",
    branches: { main: { protected: true } },
    types: {
      feature: { prefix: "feature/", base: "main", target: "main", deleteAfterFinish: true },
    },
    merge: { strategy: "merge", deleteSource: true },
    tag: { enabled: false },
    branchNaming: { case: "kebab-case", maxLength: 80 },
  },
  "trunk-based": {
    version: 1,
    workflow: "trunk-based",
    branches: { main: { protected: true } },
    types: {
      feat: { prefix: "feat/", base: "main", target: "main", deleteAfterFinish: true },
      fix: { prefix: "fix/", base: "main", target: "main", deleteAfterFinish: true },
    },
    merge: { strategy: "squash", deleteSource: true },
    tag: { enabled: false },
    branchNaming: { case: "kebab-case", maxLength: 60 },
  },
};

const DEFAULT_COMMIT_TEMPLATE = `# <type>(<scope>): <subject>
#
# <body>
#
# <footer>
#
# Allowed types: feat, fix, docs, style, refactor, test, chore
# Example: feat(auth): add password reset
`;

const DEFAULT_BRANCH_DESCRIPTION_TEMPLATE = `# Branch: {{branchName}}

## Type: {{branchType}}

## Base: {{baseBranch}}

## Created: {{createdAt}}

## Description:

{{description}}
`;

const DEFAULT_REVIEW_POLICY = `# Review policies for protected branches.
# Add one entry per branch that needs required reviews or status checks.
policies:
  - branch: main
    requiredReviews: 2
    requireStatusChecks: true
    statusCheckContexts:
      - ci/build
      - ci/test
  - branch: develop
    requiredReviews: 1
    requireStatusChecks: true
`;

const DEFAULT_STATE = { branches: {} };

interface InitOptions {
  template: string;
  format: string;
  dir: string;
  output?: string;
  force?: boolean;
  minimal?: boolean;
}

interface ScaffoldResult {
  created: string[];
  skipped: string[];
}

/** Writes `content` to `filePath` unless it already exists and `force` is false. Tracks the outcome in `result`. */
function writeScaffoldFile(
  filePath: string,
  content: string,
  force: boolean,
  result: ScaffoldResult,
): void {
  if (fs.existsSync(filePath) && !force) {
    result.skipped.push(filePath);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
  result.created.push(filePath);
}

/** Ensures an (otherwise-empty) directory exists and is kept by git via a `.gitkeep` file. */
function ensureScaffoldDir(dirPath: string, force: boolean, result: ScaffoldResult): void {
  fs.mkdirSync(dirPath, { recursive: true });
  writeScaffoldFile(path.join(dirPath, ".gitkeep"), "", force, result);
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description(
      "Scaffold a full .gitwe/ project directory: config, workflows, templates, and policies",
    )
    .option(
      "-t, --template <name>",
      "workflow template to start from: git-flow | github-flow | trunk-based",
      "git-flow",
    )
    .option("-f, --format <format>", "main config file format: json | yaml", "json")
    .option("-d, --dir <path>", "directory to scaffold", ".gitwe")
    .option(
      "-o, --output <path>",
      "override the main config file's path (default: <dir>/gitwe.json)",
    )
    .option("--force", "overwrite files that already exist")
    .option("--minimal", "only write the main config file — skip templates/policies/example dirs")
    .action((opts: InitOptions) => {
      const configTemplate = CONFIG_TEMPLATES[opts.template];
      if (!configTemplate) {
        console.error(
          `❌ Unknown template "${opts.template}". Choices: ${Object.keys(CONFIG_TEMPLATES).join(", ")}`,
        );
        process.exitCode = 1;
        return;
      }

      const isYaml = opts.format === "yaml" || opts.format === "yml";
      // const gitweDir = path.resolve(opts.dir);
      const rootDir = process.cwd();
      const gitweDir = path.resolve(rootDir, opts.dir);
      const configPath = path.resolve(
        opts.output ?? path.join(gitweDir, isYaml ? "gitwe.yaml" : "gitwe.json"),
      );

      const result: ScaffoldResult = { created: [], skipped: [] };

      // Main workflow config.
      const configContent = isYaml
        ? yaml_dump(configTemplate)
        : JSON.stringify(configTemplate, null, 2) + "\n";
      writeScaffoldFile(configPath, configContent, Boolean(opts.force), result);

      if (!opts.minimal) {
        // Example subdirectories a project can drop custom files into.
        ensureScaffoldDir(path.join(gitweDir, "workflows"), Boolean(opts.force), result);
        ensureScaffoldDir(path.join(gitweDir, "hooks"), Boolean(opts.force), result);

        // Ready-to-use templates and policy, so `renderTemplate`/`getPolicies` work out of the box.
        writeScaffoldFile(
          path.join(gitweDir, "templates", "commit-template.txt"),
          DEFAULT_COMMIT_TEMPLATE,
          Boolean(opts.force),
          result,
        );
        writeScaffoldFile(
          path.join(gitweDir, "templates", "branch-description.md"),
          DEFAULT_BRANCH_DESCRIPTION_TEMPLATE,
          Boolean(opts.force),
          result,
        );
        writeScaffoldFile(
          path.join(gitweDir, "policies", "review-policy.yaml"),
          DEFAULT_REVIEW_POLICY,
          Boolean(opts.force),
          result,
        );

        // Empty state file so tools that read it don't need to special-case "not found".
        writeScaffoldFile(
          path.join(gitweDir, "state", "branches-state.json"),
          JSON.stringify(DEFAULT_STATE, null, 2) + "\n",
          Boolean(opts.force),
          result,
        );
      }

      if (result.created.length) {
        console.log(`✅ Scaffolded ${gitweDir}:`);
        for (const file of result.created)
          console.log(`   + ${path.relative(process.cwd(), file)}`);
      }
      if (result.skipped.length) {
        console.log(`⚠️  Skipped (already exist — rerun with --force to overwrite):`);
        for (const file of result.skipped)
          console.log(`   - ${path.relative(process.cwd(), file)}`);
      }
      console.log(
        `\nRun "gitwe validate ${path.relative(process.cwd(), configPath)}" to check it, ` +
          `or "gitwe status" to use it (gitwe auto-discovers .gitwe/ in the current directory).`,
      );
    });
}
