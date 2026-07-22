import type { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

type Template = Record<string, unknown>;

const TEMPLATES: Record<string, Template> = {
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

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Scaffold a new workflow config file in the current directory")
    .option("-t, --template <name>", "template to start from: git-flow | github-flow | trunk-based", "git-flow")
    .option("-f, --format <format>", "output format: json | yaml", "json")
    .option("-o, --output <path>", "output file path (default: gitwe.json / gitwe.yaml)")
    .option("--force", "overwrite the output file if it already exists")
    .action((opts: { template: string; format: string; output?: string; force?: boolean }) => {
      const template = TEMPLATES[opts.template];
      if (!template) {
        console.error(`❌ Unknown template "${opts.template}". Choices: ${Object.keys(TEMPLATES).join(", ")}`);
        process.exitCode = 1;
        return;
      }

      const isYaml = opts.format === "yaml" || opts.format === "yml";
      const outputPath = path.resolve(opts.output ?? (isYaml ? "gitwe.yaml" : "gitwe.json"));

      if (fs.existsSync(outputPath) && !opts.force) {
        console.error(`❌ "${outputPath}" already exists. Re-run with --force to overwrite it.`);
        process.exitCode = 1;
        return;
      }

      const content = isYaml ? yaml.dump(template) : JSON.stringify(template, null, 2) + "\n";
      fs.writeFileSync(outputPath, content, "utf-8");
      console.log(`✅ Wrote ${outputPath} from the "${opts.template}" template.`);
      console.log(`   Run "gitwe validate ${outputPath}" to check it, or "gitwe --config ${outputPath} status" to use it.`);
    });
}

