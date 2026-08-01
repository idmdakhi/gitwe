# gitwe

A configurable git branching-workflow engine — usable as the `gitwe` CLI or
as a TypeScript library. Ships with presets for classic **Gitflow**,
**GitHub Flow**, and **GitLab Flow**, or define a fully custom workflow of
your own.

## Install

```bash
npm install -g gitwe        # CLI
npm install gitwe           # library
```

## Quick start

```bash
cd my-repo
gitwe init --preset gitflow   # writes gitwe.json, creates main/develop

gitwe feature start login-page
# ... commit some work ...
gitwe finish                  # merges into develop, deletes the branch

gitwe hotfix start 1.0.1
# ... commit a fix ...
gitwe finish                  # merges into main, tags v1.0.1,
                               # AND auto-updates develop from main
```

## Core concepts

A **workflow** is made of two kinds of branches:

- **Base branches** — long-lived branches like `main` or `develop`. A base
  branch can declare a `parent` and `autoUpdate: true`, meaning it
  automatically syncs whenever its parent changes. This is how, in
  classic Gitflow, a `hotfix` finished into `main` transparently reaches
  `develop` — `develop`'s parent is `main`, so it auto-updates.
- **Topic branches** — short-lived branches like `feature`, `release`,
  `hotfix`, or any custom type you declare. Each has a `prefix`, a
  `parent` base branch it merges into on `finish`, and an optional
  different `startingPoint` (e.g. Gitflow's `release` starts from
  `develop` but finishes into `main`).

Branch types are **fully configurable** — nothing is hardcoded. Add your
own with `gitwe config add-topic <name> <prefix> <parent>` and it
immediately becomes a first-class CLI command group.

## Commands

```
gitwe init [--preset gitflow|github-flow|gitlab-flow]
gitwe config show
gitwe config add-base <name> [--parent <base>] [--auto-update]
gitwe config add-topic <name> <prefix> <parent> [--starting-point <base>] [--tag]

gitwe <type> start <short-name> [--from <branch>]
gitwe <type> finish [short-name] [--strategy merge|squash|rebase] [--no-delete] [--push] [--dry-run]
gitwe <type> update [short-name] [--strategy merge|rebase]
gitwe <type> list
gitwe <type> publish [short-name]
gitwe <type> track <short-name>
gitwe <type> checkout <short-name>
gitwe <type> rename <old> <new>
gitwe <type> delete <short-name> [--force] [--remote]

# Shorthands — infer the type from the branch you're currently on:
gitwe finish | update | publish | delete | rename <new-name>
gitwe checkout <query>     # exact or partial match, local or remote
gitwe list                 # every topic branch, every type
gitwe status                # aka `gitwe overview`
```

## Configuration file

`gitwe init` writes `gitwe.json` (YAML also supported: `gitwe.yaml`) at
your repository root. It's plain data — edit it by hand or via
`gitwe config add-base` / `add-topic`:

```json
{
  "name": "gitflow",
  "remote": "origin",
  "baseBranches": [
    { "name": "main" },
    { "name": "develop", "parent": "main", "autoUpdate": true }
  ],
  "branchTypes": [
    { "name": "feature", "prefix": "feature/", "parent": "develop" },
    {
      "name": "release",
      "prefix": "release/",
      "parent": "main",
      "startingPoint": "develop",
      "autoTag": { "enabled": true, "prefix": "v" }
    }
  ]
}
```

## Using it as a library

```ts
import { Container } from "gitwe";

const container = new Container(process.cwd());
const { start, finish } = await container.forWorkflow();

const { branchName } = await start.handle({ branchType: "feature", shortName: "login" });
// ... do work, commit ...
const result = await finish.handle({ branchName });
console.log(result.mergedInto, result.tag, result.propagatedTo);
```

Every dependency is injected through a small set of **ports** —
`GitRepository`, `EventBus`, `WorkflowConfigStore` — so you can swap the
default shell-based git adapter, event bus, or config storage for your
own implementation without touching application or domain code.

## Architecture

Clean Architecture, four layers, dependencies point inward:

```
domain          — Workflow aggregate, rules, value objects, ports (interfaces only)
application     — use-case handlers (StartBranchHandler, FinishBranchHandler, ...)
infrastructure  — ShellGitRepository, FileWorkflowConfigStore, InMemoryEventBus
cli             — commander-based command tree + DI composition root
```

`src/index.ts` is the package's curated public API; only what's exported
there is part of the stable contract.

## License

MIT
