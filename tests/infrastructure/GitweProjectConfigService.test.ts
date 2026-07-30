import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GitweProjectConfigService } from "#gitwe/infrastructure/config/GitweProjectConfigService";
import { InvalidWorkflowDefinitionError } from "#gitwe/domain/errors";

const MAIN_CONFIG = {
  version: 1,
  workflow: "git-flow",
  branches: { main: { protected: true }, develop: { protected: true } },
  types: {
    feature: { prefix: "feature/", base: "develop", target: "develop" },
    release: { prefix: "release/", base: "develop", target: ["main", "develop"], tag: true },
  },
};

const CUSTOM_WORKFLOW = {
  version: 1,
  workflow: "my-flow",
  types: {
    task: { prefix: "task/", base: "main", target: "main" },
  },
};

const REVIEW_POLICY_YAML = `
policies:
  - branch: main
    requiredReviews: 2
    requireStatusChecks: true
    statusCheckContexts:
      - ci/build
  - branch: develop
    requiredReviews: 1
`;

describe("GitweProjectConfigService", () => {
  let rootDir: string;
  let gitweDir: string;

  beforeEach(() => {
    rootDir = mkdtempSync(join(tmpdir(), "gitwe-project-config-"));
    gitweDir = join(rootDir, ".gitwe");
    mkdirSync(gitweDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(rootDir, { recursive: true, force: true });
  });

  function writeMainConfig(content: unknown = MAIN_CONFIG): void {
    writeFileSync(join(gitweDir, "gitwe.json"), JSON.stringify(content));
  }

  function writeCustomWorkflow(fileName: string, content: unknown): void {
    mkdirSync(join(gitweDir, "workflows"), { recursive: true });
    writeFileSync(join(gitweDir, "workflows", fileName), JSON.stringify(content));
  }

  function writeTemplate(fileName: string, content: string): void {
    mkdirSync(join(gitweDir, "templates"), { recursive: true });
    writeFileSync(join(gitweDir, "templates", fileName), content);
  }

  function writePolicy(fileName: string, content: string): void {
    mkdirSync(join(gitweDir, "policies"), { recursive: true });
    writeFileSync(join(gitweDir, "policies", fileName), content);
  }

  describe("load()", () => {
    it("returns null configPath/rawConfig when there is no .gitwe/gitwe.json", () => {
      const service = new GitweProjectConfigService({ rootDir });
      const data = service.load();
      expect(data.configPath).toBeNull();
      expect(data.rawConfig).toBeNull();
      expect(data.workflowFiles).toEqual([]);
      expect(data.templateFiles).toEqual([]);
      expect(data.policies).toEqual([]);
    });

    it("reads the main config, workflows, templates, and policies together", () => {
      writeMainConfig();
      writeCustomWorkflow("my-flow.json", CUSTOM_WORKFLOW);
      writeTemplate("commit-template.txt", "feat: {{subject}}");
      writePolicy("review-policy.yaml", REVIEW_POLICY_YAML);

      const service = new GitweProjectConfigService({ rootDir });
      const data = service.load();

      expect(data.configPath).toBe(join(gitweDir, "gitwe.json"));
      expect(data.rawConfig?.["workflow"]).toBe("git-flow");
      expect(data.workflowFiles).toEqual([join(gitweDir, "workflows", "my-flow.json")]);
      expect(data.templateFiles).toEqual([join(gitweDir, "templates", "commit-template.txt")]);
      expect(data.policies).toHaveLength(2);
    });

    it("caches on repeated load() calls and only re-reads disk on reload()", () => {
      writeMainConfig();
      const service = new GitweProjectConfigService({ rootDir });
      const first = service.load();

      writeMainConfig({ ...MAIN_CONFIG, workflow: "github-flow" });
      expect(service.load().rawConfig?.["workflow"]).toBe("git-flow");
      expect(service.load()).toBe(first);

      const reloaded = service.reload();
      expect(reloaded.rawConfig?.["workflow"]).toBe("github-flow");
    });
  });

  describe("getWorkflow() / listWorkflowNames()", () => {
    it("resolves the workflow declared in the main config by default", () => {
      writeMainConfig();
      const workflow = new GitweProjectConfigService({ rootDir }).getWorkflow();
      expect(workflow.name).toBe("git-flow");
      expect(workflow.listBranchTypeNames().sort()).toEqual(["feature", "release"]);
    });

    it("resolves a custom workflow file by name, taking priority over the main config", () => {
      writeMainConfig();
      writeCustomWorkflow("my-flow.json", CUSTOM_WORKFLOW);

      const service = new GitweProjectConfigService({ rootDir });
      const workflow = service.getWorkflow("my-flow");
      expect(workflow.name).toBe("my-flow");
      expect(workflow.listBranchTypeNames()).toEqual(["task"]);
    });

    it("falls back to a built-in workflow when nothing on disk matches", () => {
      const service = new GitweProjectConfigService({ rootDir });
      const workflow = service.getWorkflow("trunk-based");
      expect(workflow.name).toBe("trunk-based");
    });

    it("throws a descriptive error for an unknown workflow name", () => {
      const service = new GitweProjectConfigService({ rootDir });
      expect(() => service.getWorkflow("does-not-exist")).toThrow(InvalidWorkflowDefinitionError);
      expect(() => service.getWorkflow("does-not-exist")).toThrow(/does-not-exist/);
    });

    it("lists built-in, custom, and main-config workflow names without duplicates", () => {
      writeMainConfig();
      writeCustomWorkflow("my-flow.json", CUSTOM_WORKFLOW);
      const names = new GitweProjectConfigService({ rootDir }).listWorkflowNames();
      expect(names).toEqual(
        expect.arrayContaining(["git-flow", "github-flow", "trunk-based", "my-flow"]),
      );
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe("setActiveWorkflow() / getActiveWorkflowName()", () => {
    it("defaults to the main config's workflow, then git-flow if there is none", () => {
      expect(new GitweProjectConfigService({ rootDir }).getActiveWorkflowName()).toBe("git-flow");
      writeMainConfig({ ...MAIN_CONFIG, workflow: "github-flow" });
      expect(new GitweProjectConfigService({ rootDir }).getActiveWorkflowName()).toBe(
        "github-flow",
      );
    });

    it("switches the active workflow in memory and validates it resolves", () => {
      writeMainConfig();
      writeCustomWorkflow("my-flow.json", CUSTOM_WORKFLOW);

      const service = new GitweProjectConfigService({ rootDir });
      service.setActiveWorkflow("my-flow");

      expect(service.getActiveWorkflowName()).toBe("my-flow");
      expect(service.getWorkflow().name).toBe("my-flow");
    });

    it("rejects switching to a workflow that can't be resolved", () => {
      const service = new GitweProjectConfigService({ rootDir });
      expect(() => service.setActiveWorkflow("nope")).toThrow(InvalidWorkflowDefinitionError);
    });
  });

  describe("renderTemplate() / listTemplateNames()", () => {
    it("substitutes {{key}} placeholders with the given variables", () => {
      writeTemplate("commit-template.txt", "feat({{scope}}): {{subject}}\n");
      const rendered = new GitweProjectConfigService({ rootDir }).renderTemplate(
        "commit-template.txt",
        { scope: "auth", subject: "add password reset" },
      );
      expect(rendered).toBe("feat(auth): add password reset\n");
    });

    it("leaves unknown placeholders untouched", () => {
      writeTemplate("branch-description.md", "# {{branchName}} ({{unknownVar}})");
      const rendered = new GitweProjectConfigService({ rootDir }).renderTemplate(
        "branch-description.md",
        { branchName: "feature/login" },
      );
      expect(rendered).toBe("# feature/login ({{unknownVar}})");
    });

    it("throws a descriptive error for a missing template", () => {
      const service = new GitweProjectConfigService({ rootDir });
      expect(() => service.renderTemplate("nope.txt", {})).toThrow(InvalidWorkflowDefinitionError);
    });

    it("lists every template file name", () => {
      writeTemplate("commit-template.txt", "");
      writeTemplate("branch-description.md", "");
      const names = new GitweProjectConfigService({ rootDir }).listTemplateNames().sort();
      expect(names).toEqual(["branch-description.md", "commit-template.txt"]);
    });
  });

  describe("getPolicies() / getPolicyForBranch()", () => {
    it("parses review policies from every policy file", () => {
      writePolicy("review-policy.yaml", REVIEW_POLICY_YAML);
      const policies = new GitweProjectConfigService({ rootDir }).getPolicies();
      expect(policies).toHaveLength(2);
      expect(policies[0]).toMatchObject({ branch: "main", requiredReviews: 2 });
    });

    it("finds the policy for a specific branch", () => {
      writePolicy("review-policy.yaml", REVIEW_POLICY_YAML);
      const policy = new GitweProjectConfigService({ rootDir }).getPolicyForBranch("develop");
      expect(policy).toMatchObject({ branch: "develop", requiredReviews: 1 });
    });

    it("returns undefined for a branch with no policy", () => {
      writePolicy("review-policy.yaml", REVIEW_POLICY_YAML);
      const policy = new GitweProjectConfigService({ rootDir }).getPolicyForBranch("feature/x");
      expect(policy).toBeUndefined();
    });

    it("skips an unparsable policy file instead of throwing", () => {
      writePolicy("broken.yaml", "not: [valid, yaml,");
      const policies = new GitweProjectConfigService({ rootDir }).getPolicies();
      expect(policies).toEqual([]);
    });
  });

  describe("customize() / getEffectiveConfig() / save()", () => {
    it("deep-merges overrides on top of the on-disk config without touching disk", () => {
      writeMainConfig();
      const service = new GitweProjectConfigService({ rootDir });
      service.customize({ versioning: { defaultBump: "minor" }, workflow: "github-flow" });

      const effective = service.getEffectiveConfig();
      expect(effective["workflow"]).toBe("github-flow");
      expect((effective["versioning"] as Record<string, unknown>)?.["defaultBump"]).toBe("minor");

      const onDisk = JSON.parse(readFileSync(join(gitweDir, "gitwe.json"), "utf-8"));
      expect(onDisk.workflow).toBe("git-flow");
    });

    it("resetCustomization() discards overrides", () => {
      writeMainConfig();
      const service = new GitweProjectConfigService({ rootDir });
      service.customize({ workflow: "github-flow" });
      service.resetCustomization();
      expect(service.getEffectiveConfig()["workflow"]).toBe("git-flow");
    });

    it("save() persists the effective config back to gitwe.json and reloads", () => {
      writeMainConfig();
      const service = new GitweProjectConfigService({ rootDir });
      service.customize({ workflow: "github-flow" });
      service.save();

      const onDisk = JSON.parse(readFileSync(join(gitweDir, "gitwe.json"), "utf-8"));
      expect(onDisk.workflow).toBe("github-flow");
      expect(service.load().rawConfig?.["workflow"]).toBe("github-flow");
    });

    it("save() creates gitwe.json when no main config existed yet", () => {
      const service = new GitweProjectConfigService({ rootDir });
      service.customize({ workflow: "trunk-based", version: 1 });
      service.save();

      const onDisk = JSON.parse(readFileSync(join(gitweDir, "gitwe.json"), "utf-8"));
      expect(onDisk.workflow).toBe("trunk-based");
    });
  });
});
