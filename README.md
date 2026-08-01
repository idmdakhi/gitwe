# gitwe

[![CI](https://github.com/idmdakhi/gitwe/actions/workflows/ci.yaml/badge.svg)](https://github.com/idmdakhi/gitwe/actions/workflows/ci.yaml)
[![npm version](https://img.shields.io/npm/v/gitwe.svg)](https://www.npmjs.com/package/gitwe)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**gitwe** is a git **workflow engine**. You describe your branching model once — base
branches, topic branch types, merge strategies, tagging — and gitwe executes every
`start` / `finish` / `update` / `publish` operation according to that description.

git-flow is not built into the engine: it is just one of the workflow definitions that
ship with it, alongside GitHub Flow and GitLab Flow. Anything you can express as
"topic branches that integrate into base branches" is a first-class workflow.

```bash
npm install -g gitwe

gitwe init --preset classic     # or: github, gitlab
gitwe feature start login
gitwe feature finish login
```

## Why an engine?

Classic git-flow tools hard-code five branch types and their rules. gitwe keeps the
rules in data:

```jsonc
{
  "baseBranches": [
    { "name": "main" },
    { "name": "develop", "parent": "main", "autoUpdate": true }
  ],
  "topicTypes": [
    { "name": "feature", "parent": "develop" },
    { "name": "release", "parent": "main", "startPoint": "develop", "tag": true }
  ]
}
```

From that definition the engine derives everything: which branch `feature start` forks
from, where `release finish` merges and tags, that `develop` must be brought back in
sync with `main` afterwards, and which CLI commands even exist — `gitwe <type> …` is
generated per topic type, so adding a `spike` type immediately gives you
`gitwe spike start|finish|publish|…`.

## Installation

```bash
npm install -g gitwe          # CLI
npm install gitwe             # library (Node.js >= 20, ESM)
```

## Commands

| Command | Description |
| --- | --- |
| `gitwe init [--preset classic\|github\|gitlab] [--defaults]` | write a workflow definition and create missing base branches |
| `gitwe config list \| add \| edit \| rename \| delete` | inspect and edit the definition |
| `gitwe overview [--format text\|json\|yaml]` (alias `status`) | configuration, branch structure and health |
| `gitwe <type> start <name> [base]` | create a topic branch |
| `gitwe <type> finish [name]` | integrate a topic branch into its parent |
| `gitwe <type> publish [name]` | push a topic branch and set its upstream |
| `gitwe <type> track <name>` | check out a topic branch published by someone else |
| `gitwe <type> update [name] [--rebase]` | bring a topic branch up to date with its parent |
| `gitwe <type> list [pattern]` | list topic branches (`*`, `?`, `[abc]` globs) |
| `gitwe <type> checkout <name\|prefix>` | switch to a topic branch, partial names allowed |
| `gitwe <type> rename <old> [new]` | rename a topic branch |
| `gitwe <type> delete [name] [-r]` | delete a topic branch, optionally its remote |
| `gitwe start\|finish\|update\|rebase\|publish\|delete\|rename` | shorthands for the current branch |
| `gitwe version` | print the gitwe version |

Global options — `--config <path>`, `--cwd <path>`, `-v, --verbose`, `--no-color` — are
accepted anywhere on the command line.

See [docs/commands.md](docs/commands.md) for every flag and
[docs/workflow-definition.md](docs/workflow-definition.md) for the definition format.

### Finishing a branch

`finish` is a state machine: merge (or squash/rebase) into the parent, tag it if the
topic type asks for it, update every auto-updating child branch, push if requested,
then delete the topic branch. If git stops on a conflict, gitwe saves its progress:

```bash
gitwe feature finish login
# conflict: git merge stopped on conflicts in: src/app.ts

# ... resolve, then git add the files ...
gitwe feature finish --continue     # resume exactly where it stopped
gitwe feature finish --abort        # or roll every touched branch and tag back
```

## Library use

```ts
import { Engine, createPreset } from "gitwe";

const engine = await Engine.create({ root: process.cwd(), config: createPreset("classic") });

await engine.start("feature", "login");
await engine.finish(engine.resolve("feature", "login"), { squash: true });
```

Every operation is typed, returns a structured result, and never prints anything —
the CLI is a thin layer on top of it.

## Hooks

Executable scripts in `.gitwe/hooks/` run around operations: `pre-start`, `post-start`,
`pre-finish`, `post-finish`, `pre-update`, `post-update`, `pre-publish`, `post-publish`,
`pre-delete`, `post-delete`. Context is passed as `GITWE_BRANCH`, `GITWE_TOPIC_TYPE`
and `GITWE_PARENT`; a non-zero exit aborts the operation.

## Compatibility

gitwe drives the `git` binary directly, so it works with any git >= 2.30 and needs no
native modules. Definitions are plain JSON or YAML (`gitwe.json`, `.gitwe.yaml`, …),
which makes them reviewable and shareable across a team.

## License

[MIT](LICENSE) © Mohammad Amanalikhani
