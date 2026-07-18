#!/usr/bin/env node
import { Command } from "commander";
import fs from "fs";
import { ShellGitAdapter } from "../adapters/ShellGitAdapter";
import { WorkflowEngine } from "../core/WorkflowEngine";
import {
  gitFlowDefinition,
  validateWorkflowDefinition,
  type WorkflowDefinition,
} from "../core/WorkflowDefinition";
import { ConsoleLogger } from "../logging/Logger";
import { GitflowError, GitCommandError } from "../core/errors";
import packageJson from "../../package.json";
import treeify from "treeify";

const logger = new ConsoleLogger();

// متغیر سطح ماژول برای نگهداری کانفیگ بارگذاری‌شده
let loadedConfig: WorkflowDefinition | undefined;

/**
 * بارگذاری کانفیگ از فایل یا استفاده از پیش‌فرض
 * با اعتبارسنجی کامل و مدیریت خطا
 */
function loadDefinition(configPath: string | undefined): WorkflowDefinition {
  if (configPath && fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      // استفاده از type assertion با اعتبارسنجی اضافی
      const parsed = JSON.parse(raw) as unknown;
      if (!isWorkflowDefinition(parsed)) {
        throw new Error("Invalid workflow definition structure");
      }
      validateWorkflowDefinition(parsed);
      logger.info("Workflow definition loaded", { path: configPath, name: parsed.name });
      return parsed;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error("Failed to load config file", {
        path: configPath,
        error: errorMessage,
      });
      throw err;
    }
  }
  logger.info("Using built-in git-flow definition");
  return gitFlowDefinition;
}

/**
 * Type guard برای بررسی ساختار WorkflowDefinition
 * این تابع از `any` استفاده نمی‌کند و با `unknown` کار می‌کند
 */
function isWorkflowDefinition(value: unknown): value is WorkflowDefinition {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.name !== "string") return false;
  if (!Array.isArray(obj.branchTypes)) return false;
  return obj.branchTypes.every((rule: unknown) => {
    if (typeof rule !== "object" || rule === null) return false;
    const r = rule as Record<string, unknown>;
    return (
      typeof r.name === "string" &&
      typeof r.prefix === "string" &&
      typeof r.baseBranch === "string" &&
      Array.isArray(r.mergeTargets) &&
      r.mergeTargets.every((t: unknown) => typeof t === "string") &&
      (r.deleteOnFinish === undefined || typeof r.deleteOnFinish === "boolean")
    );
  });
}

const program = new Command();

program
  .name("gitwe")
  .description("gitflow-engine — a rule-based git branching workflow CLI")
  .version(packageJson.version);

// تعریف نوع برای گزینه‌های سراسری
interface GlobalOptions {
  config?: string;
}

// گزینه‌های سراسری
program
  .option("-c, --config <path>", "Path to custom workflow config JSON file")
  .hook("preAction", (thisCommand) => {
    const opts = thisCommand.opts<GlobalOptions>();
    loadedConfig = loadDefinition(opts.config);
  });

// تابع کمکی برای ساخت Engine
function getEngine(): WorkflowEngine {
  const def = loadedConfig ?? gitFlowDefinition;
  return new WorkflowEngine(new ShellGitAdapter(process.cwd(), logger), def, logger);
}

// دستورات
program
  .command("current")
  .description("Print the current branch")
  .action(async () => {
    const engine = getEngine();
    console.log(await engine.currentBranch());
  });

program
  .command("list")
  .description("List local branches")
  .action(async () => {
    const engine = getEngine();
    const branches = await engine.listBranches();
    for (const b of branches) {
      console.log(`${b.isCurrent ? "*" : " "} ${b.name}`);
    }
  });

program
  .command("types")
  .description("List branch types defined by the current workflow")
  .action(() => {
    const engine = getEngine();
    for (const t of engine.listBranchTypes()) {
      console.log(t);
    }
  });

program
  .command("start <type> <name>")
  .description("Start a new branch of a given type (e.g. gitwe start feature login)")
  .action(async (type: string, name: string) => {
    const engine = getEngine();
    const fullName = await engine.start(type, name);
    console.log(`Created and checked out "${fullName}"`);
  });

program
  .command("finish <branch>")
  .description("Merge a branch into its configured targets and delete it")
  .option("--keep", "keep the branch after merging instead of deleting it")
  .option("--abort-on-conflict", "abort merge if conflict occurs (experimental)")
  .action(async (branch: string, opts: { keep?: boolean; abortOnConflict?: boolean }) => {
    const engine = getEngine();
    try {
      const result = await engine.finish(branch, { deleteAfterMerge: !opts.keep });
      for (const m of result.merges) {
        console.log(`Merged "${m.source}" into "${m.target}"`);
      }
      if (result.deleted) {
        console.log(`Deleted "${branch}"`);
      }
    } catch (err) {
      // مدیریت ایمن خطاها با استفاده از type guards
      if (err instanceof GitCommandError) {
        if (err.stderr?.includes("merge conflict")) {
          console.error(
            "❌ Merge conflict detected! Please resolve conflicts manually and commit.",
          );
          if (opts.abortOnConflict) {
            console.log("Aborting merge...");
            // پیاده‌سازی abort در آینده
          }
        } else {
          console.error(`Git error: ${err.message}`);
        }
      } else if (err instanceof GitflowError) {
        console.error(`Error [${err.code}]: ${err.message}`);
      } else {
        console.error(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      }
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  if (err instanceof GitflowError) {
    console.error(`Error [${err.code}]: ${err.message}`);
  } else {
    console.error(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  }
  process.exitCode = 1;
});
program
  .command("status")
  .description("Show a visual report of branches and their relationships")
  .option("--root <branch>", "Root branch for the tree (default: main)")
  .action(async (opts: { root?: string }) => {
    const engine = getEngine();
    const rootBranch = opts.root || "main";

    // 1. دریافت همه‌ی شاخه‌ها
    const branches = await engine.listBranches();
    const branchNames = branches.map((b) => b.name);

    // 2. دریافت اطلاعات والد برای هر شاخه
    const parentMap = new Map<string, string>();
    for (const name of branchNames) {
      if (name === rootBranch) continue; // ریشه والد ندارد
      const parent = await engine.git.getBranchParent(name);
      if (parent && branchNames.includes(parent)) {
        parentMap.set(name, parent);
      } else {
        // اگر والد در لیست نبود، به ریشه متصل کن
        parentMap.set(name, rootBranch);
      }
    }

    // 3. ساخت درخت
    const tree: Record<string, any> = {};
    const currentNode = await engine.currentBranch();

    // تابع بازگشتی برای ساخت درخت
    function buildTree(parent: string): Record<string, any> {
      const children = [...parentMap.entries()]
        .filter(([, p]) => p === parent)
        .map(([child]) => child)
        .sort();

      if (children.length === 0) return {};

      const node: Record<string, any> = {};
      for (const child of children) {
        const childTree = buildTree(child);
        const isCurrent = child === currentNode;
        node[`${child}${isCurrent ? " (current)" : ""}`] =
          Object.keys(childTree).length > 0 ? childTree : null;
      }
      return node;
    }

    // 4. ریشه‌ی درخت
    const treeData = buildTree(rootBranch);
    const rootDisplay = `${rootBranch}${rootBranch === currentNode ? " (current)" : ""}`;
    const fullTree: Record<string, any> = {
      [rootDisplay]: Object.keys(treeData).length > 0 ? treeData : null,
    };

    // 5. نمایش درخت
    console.log("\n📊 Git Workflow Status\n");
    console.log(`Current branch: ${currentNode}\n`);
    console.log(treeify.asTree(fullTree, true));

    // 6. اطلاعات اضافی (اختیاری)
    console.log("\n📈 Statistics:");
    console.log(`  Total branches: ${branches.length}`);
    console.log(`  Branch types: ${engine.listBranchTypes().join(", ")}`);
  });
