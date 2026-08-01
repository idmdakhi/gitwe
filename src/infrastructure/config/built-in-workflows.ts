import { Workflow } from "#gitwe/domain/aggregates/workflow";
import { BaseBranchRule } from "#gitwe/domain/valueObjects/base-branch-rule";
import { BranchTypeRule } from "#gitwe/domain/valueObjects/branch-type-rule";

/** Identifiers for the ready-made workflow presets in {@link BUILT_IN_WORKFLOWS}. @public */
export const BUILT_IN_WORKFLOW_NAMES = ["gitflow", "github-flow", "gitlab-flow"] as const;

/** A built-in workflow preset name. @public */
export type BuiltInWorkflowName = (typeof BUILT_IN_WORKFLOW_NAMES)[number];

/**
 * Classic Gitflow (nvie/gitflow, gitflow-avh): `main` + `develop`, with
 * `feature`, `release`, `hotfix`, and `support` topic branches. A
 * `hotfix` finished into `main` auto-propagates into `develop`; a
 * `release` starts from `develop` but finishes (and tags) into `main`,
 * which then also auto-propagates into `develop`.
 */
function gitflow(): Workflow {
  return Workflow.create({
    name: "gitflow",
    baseBranches: [
      BaseBranchRule.create({ name: "main" }),
      BaseBranchRule.create({ name: "develop", parent: "main", autoUpdate: true }),
    ],
    branchTypes: [
      BranchTypeRule.create({ name: "feature", prefix: "feature/", parent: "develop" }),
      BranchTypeRule.create({
        name: "release",
        prefix: "release/",
        parent: "main",
        startingPoint: "develop",
        autoTag: { enabled: true, prefix: "v" },
      }),
      BranchTypeRule.create({
        name: "hotfix",
        prefix: "hotfix/",
        parent: "main",
        autoTag: { enabled: true, prefix: "v" },
      }),
      BranchTypeRule.create({
        name: "support",
        prefix: "support/",
        parent: "main",
        deleteOnFinish: false,
      }),
    ],
  });
}

/**
 * GitHub Flow: a single long-lived `main`, with short-lived `feature`
 * branches merged (and deleted) directly back into it.
 */
function githubFlow(): Workflow {
  return Workflow.create({
    name: "github-flow",
    baseBranches: [BaseBranchRule.create({ name: "main" })],
    branchTypes: [BranchTypeRule.create({ name: "feature", prefix: "feature/", parent: "main" })],
  });
}

/**
 * GitLab Flow (environment-branches variant): `main` -> `staging` ->
 * `production`, each auto-updating from its upstream neighbor. `feature`
 * branches target `main`; `hotfix` branches target `production` directly
 * for urgent fixes (note: v1 does not auto-propagate a hotfix "upward"
 * from `production` back through `staging`/`main` — cherry-pick or merge
 * that manually, or model hotfixes against `main` instead).
 */
function gitlabFlow(): Workflow {
  return Workflow.create({
    name: "gitlab-flow",
    baseBranches: [
      BaseBranchRule.create({ name: "main" }),
      BaseBranchRule.create({ name: "staging", parent: "main", autoUpdate: true }),
      BaseBranchRule.create({ name: "production", parent: "staging", autoUpdate: true }),
    ],
    branchTypes: [
      BranchTypeRule.create({ name: "feature", prefix: "feature/", parent: "main" }),
      BranchTypeRule.create({
        name: "hotfix",
        prefix: "hotfix/",
        parent: "production",
        autoTag: { enabled: true, prefix: "v" },
      }),
    ],
  });
}

/**
 * Ready-made {@link Workflow} presets, usable directly or as a starting
 * point for `gitwe init --preset <name>`.
 *
 * @public
 */
export const BUILT_IN_WORKFLOWS: Record<BuiltInWorkflowName, () => Workflow> = {
  gitflow,
  "github-flow": githubFlow,
  "gitlab-flow": gitlabFlow,
};
