// src/cli/commands/init.ts
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { printResult } from "#gitwe/cli/output";
import { reportError } from "#gitwe/cli/reportError";

const BUILT_IN_WORKFLOW_NAMES = ["git-flow", "github-flow", "trunk-based"] as const;
type BuiltInWorkflowName = (typeof BUILT_IN_WORKFLOW_NAMES)[number];

function getBuiltInConfig(name: BuiltInWorkflowName): object {
  switch (name) {
    case "git-flow":
      return {
        name: "git-flow",
        branchTypes: [
          {
            name: "feature",
            prefix: "feature/",
            baseBranch: "develop",
            mergeTargets: ["develop"],
            deleteOnFinish: true,
          },
          {
            name: "release",
            prefix: "release/",
            baseBranch: "develop",
            mergeTargets: ["main", "develop"],
            deleteOnFinish: true,
            autoTag: { prefix: "v" },
          },
          {
            name: "hotfix",
            prefix: "hotfix/",
            baseBranch: "main",
            mergeTargets: ["main", "develop"],
            deleteOnFinish: true,
          },
        ],
        hooks: {
          preStart: ["npm run lint"],
          postStart: ["echo '🎉 Branch created!'"],
          preFinish: ["npm run test", "npm run build"],
          postFinish: ["echo '✅ Branch finished!'"],
        },
        remote: { remote: "origin", autoPush: false, autoPull: false },
      };

    case "github-flow":
      return {
        name: "github-flow",
        branchTypes: [
          {
            name: "feature",
            prefix: "feature/",
            baseBranch: "main",
            mergeTargets: ["main"],
            deleteOnFinish: true,
          },
          {
            name: "bugfix",
            prefix: "bugfix/",
            baseBranch: "main",
            mergeTargets: ["main"],
            deleteOnFinish: true,
          },
          {
            name: "hotfix",
            prefix: "hotfix/",
            baseBranch: "main",
            mergeTargets: ["main"],
            deleteOnFinish: true,
          },
        ],
        hooks: { preFinish: ["npm run lint", "npm run test"] },
        remote: { remote: "origin", autoPush: true, autoPull: true },
      };

    case "trunk-based":
      return {
        name: "trunk-based",
        branchTypes: [
          {
            name: "feature",
            prefix: "feat/",
            baseBranch: "main",
            mergeTargets: ["main"],
            deleteOnFinish: true,
          },
          {
            name: "bugfix",
            prefix: "fix/",
            baseBranch: "main",
            mergeTargets: ["main"],
            deleteOnFinish: true,
          },
          {
            name: "chore",
            prefix: "chore/",
            baseBranch: "main",
            mergeTargets: ["main"],
            deleteOnFinish: true,
          },
          {
            name: "release",
            prefix: "release/",
            baseBranch: "main",
            mergeTargets: ["main"],
            deleteOnFinish: true,
            autoTag: { prefix: "v" },
          },
        ],
        hooks: { preFinish: ["npm run test", "npm run build"] },
        remote: { remote: "origin", autoPush: true, autoPull: true },
      };
  }
}

async function askQuestion(query: string, defaultAnswer = ""): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve((answer.trim() || defaultAnswer).toLowerCase());
    });
  });
}

export function registerInitCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("init")
    .description("Initialize a gitwe workflow configuration file in the current repository")
    .option(
      "-w, --workflow <name>",
      `built-in workflow: ${BUILT_IN_WORKFLOW_NAMES.join(" | ")}`,
      "git-flow",
    )
    .option("-f, --force", "overwrite existing config without asking")
    .option("--no-setup-branches", "do not create missing base branches")
    .option("-o, --output <path>", "path where the config file will be written", "gitwe.json")
    .action(
      async (opts: {
        workflow: BuiltInWorkflowName;
        force: boolean;
        setupBranches: boolean;
        output: string;
      }) => {
        const json = getJson();
        const outputPath = path.resolve(process.cwd(), opts.output);

        try {
          console.log("\n🚀 gitwe Initialization");
          console.log("=".repeat(50));

          // Workflow selection
          let workflow: BuiltInWorkflowName = opts.workflow;

          if (!BUILT_IN_WORKFLOW_NAMES.includes(workflow)) {
            console.log("\n📋 Available workflows:");
            BUILT_IN_WORKFLOW_NAMES.forEach((w, i) => console.log(`   ${i + 1}. ${w}`));

            const answer = await askQuestion(`\nChoose workflow (default: git-flow): `, "git-flow");
            workflow = BUILT_IN_WORKFLOW_NAMES.includes(answer as BuiltInWorkflowName)
              ? (answer as BuiltInWorkflowName)
              : "git-flow";
          }

          // Confirm overwrite
          if (fs.existsSync(outputPath) && !opts.force) {
            const answer = await askQuestion(
              `⚠️ Config file "${opts.output}" already exists. Overwrite? (y/N): `,
              "n",
            );
            if (answer !== "y") {
              printResult(json, { aborted: true }, () =>
                console.log("❌ Initialization cancelled."),
              );
              return;
            }
          }

          // Write config file
          const configData = getBuiltInConfig(workflow);
          fs.writeFileSync(outputPath, JSON.stringify(configData, null, 2), "utf-8");

          printResult(json, { created: outputPath, workflow }, () =>
            console.log(`✅ Created workflow config at: ${outputPath}`),
          );

          // Setup base branches
          if (opts.setupBranches !== false) {
            const container = getContainer();
            const git = container.git;

            // Extract base branches from the generated config data
            const baseBranches = new Set<string>();
            const branchTypes = (configData as { branchTypes: { baseBranch: string }[] })
              .branchTypes;
            for (const rule of branchTypes) {
              baseBranches.add(rule.baseBranch);
            }

            console.log(`\n🌿 Checking ${baseBranches.size} base branch(es)...`);

            // Ensure the repository has at least one commit and a 'main' branch
            let hasCommit = false;
            try {
              await git.runRaw(["rev-parse", "HEAD"]);
              hasCommit = true;
            } catch {
              // No commit yet
            }

            if (!hasCommit) {
              // Create 'main' with an initial empty commit
              await git.runRaw(["checkout", "--orphan", "main"]);
              await git.runRaw(["commit", "--allow-empty", "-m", "Initial commit"]);
              console.log("   📝 Created initial commit on 'main'");
            }

            // Ensure 'main' exists (if it wasn't created above, it should already exist)
            if (!(await git.branchExists("main"))) {
              // If for some reason 'main' doesn't exist, create it from current HEAD
              await git.runRaw(["branch", "main"]);
              console.log("   ✅ Created branch: main");
            }

            let createdCount = 0;
            let existedCount = 0;

            for (const branchName of baseBranches) {
              if (branchName === "main") {
                if (await git.branchExists("main")) {
                  existedCount++;
                }
                continue;
              }

              if (await git.branchExists(branchName)) {
                existedCount++;
                continue;
              }

              try {
                // Create branch from 'main' using correct git syntax: git branch <new> <start-point>
                await git.runRaw(["branch", branchName, "main"]);
                createdCount++;
                console.log(`   ✅ Created branch: ${branchName}`);
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.warn(`   ⚠️  Failed to create branch ${branchName}: ${msg}`);
              }
            }

            if (createdCount > 0) {
              console.log(`✅ Successfully created ${createdCount} new branch(es).`);
            } else if (existedCount > 0) {
              console.log(`ℹ️  All base branches (${existedCount}) already existed.`);
            } else {
              console.log("ℹ️  No new branches needed.");
            }
          }

          console.log("\n🎉 gitwe initialization complete!");
          console.log("\n💡 Next commands:");
          console.log("   gitwe start feature/my-feature");
          console.log("   gitwe finish");
        } catch (error) {
          process.exitCode = reportError(error, json);
        }
      },
    );
}
