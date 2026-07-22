import { Workflow } from "#gitwe/domain/aggregates/Workflow";
import { BranchTypeRule } from "#gitwe/domain/valueObjects/BranchTypeRule";
import { RemoteConfig } from "#gitwe/domain/valueObjects/RemoteConfig";

/**
 * `gitwe`'s engine has no idea what "git-flow" means — it just executes
 * whatever `Workflow` it's given. These are ready-made examples; a
 * consumer can just as easily build their own via `Workflow.create(...)`
 * or load one from JSON/YAML with `WorkflowConfigLoader`.
 */

export const gitFlowWorkflow: Workflow = Workflow.create({
  name: "git-flow",
  branchTypes: [
    BranchTypeRule.create({
      name: "feature",
      prefix: "feature/",
      baseBranch: "develop",
      mergeTargets: ["develop"],
      deleteOnFinish: true,
    }),
    BranchTypeRule.create({
      name: "release",
      prefix: "release/",
      baseBranch: "develop",
      mergeTargets: ["main", "develop"],
      deleteOnFinish: true,
      autoTag: { prefix: "v" },
    }),
    BranchTypeRule.create({
      name: "hotfix",
      prefix: "hotfix/",
      baseBranch: "main",
      mergeTargets: ["main", "develop"],
      deleteOnFinish: true,
    }),
  ],
  remote: RemoteConfig.create({ remote: "origin", autoPush: false, autoPull: false }),
});

export const githubFlowWorkflow: Workflow = Workflow.create({
  name: "github-flow",
  branchTypes: [
    BranchTypeRule.create({
      name: "feature",
      prefix: "feature/",
      baseBranch: "main",
      mergeTargets: ["main"],
      deleteOnFinish: true,
    }),
  ],
});

export const trunkBasedWorkflow: Workflow = Workflow.create({
  name: "trunk-based",
  branchTypes: [
    BranchTypeRule.create({
      name: "feature",
      prefix: "feat/",
      baseBranch: "main",
      mergeTargets: ["main"],
      deleteOnFinish: true,
    }),
    BranchTypeRule.create({
      name: "bugfix",
      prefix: "fix/",
      baseBranch: "main",
      mergeTargets: ["main"],
      deleteOnFinish: true,
    }),
  ],
});

export const builtInWorkflows: Record<string, Workflow> = {
  "git-flow": gitFlowWorkflow,
  "github-flow": githubFlowWorkflow,
  "trunk-based": trunkBasedWorkflow,
};

