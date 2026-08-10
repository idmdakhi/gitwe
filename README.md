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
gitwe start feature login
gitwe finish
```

## Why an engine?

Classic git-flow tools hard-code five branch types and their rules. gitwe keeps the
rules in data:

```jsonc
{
  "baseBranches": [{ "name": "main" }, { "name": "develop", "parent": "main" }],
  "branchTypes": [
    { "name": "feature", "parent": "develop" },
    { "name": "release", "parent": "main", "startPoint": "develop", "tag": true },
  ],
}
```

From that definition the engine derives everything: which branch `start feature` forks
from, where `finish release ` merges and tags, and that `develop` must be brought back in
sync with `main` afterwards. Adding a new topic type (e.g. `spike`) automatically makes
it available to all commands — you just use `gitwe start spike ...` and the engine
follows the rules you defined.

## Installation

```bash
npm install -g gitwe          # CLI
npm install gitwe             # library (Node.js >= 20, ESM)
```

## Commands

| Command                                                              | Description                                                     |
| -------------------------------------------------------------------- | --------------------------------------------------------------- |
| `gitwe init [--preset classic\|github\|gitlab] [--defaults]`         | write a workflow definition and create missing base branches    |
| `gitwe config list \| add \| edit \| rename \| delete`               | inspect and edit the definition                                 |
| `gitwe overview [--format text\|json\|yaml\|table]` (alias `status`) | configuration, branch structure and health                      |
| `gitwe start <type> <name> [base] [--fetch]`                         | create a topic branch                                           |
| `gitwe finish [name] [options]`                                      | integrate a topic branch into its parent                        |
| `gitwe update [name] [--rebase] [--fetch]`                           | bring a topic branch up to date with its parent                 |
| `gitwe rebase [name]`                                                | update a topic branch by rebasing (alias for `update --rebase`) |
| `gitwe publish [name] [-o <push-option>...]`                         | push a topic branch and set its upstream                        |
| `gitwe delete [name] [-f] [-r]`                                      | delete a topic branch, optionally its remote                    |
| `gitwe rename <new-name>`                                            | rename the current topic branch                                 |
| `gitwe checkout <type> <name\|prefix>`                               | switch to a topic branch, partial names allowed                 |
| `gitwe track <type> <name>`                                          | create a local topic branch tracking the remote one             |
| `gitwe list <type> [pattern]`                                        | list topic branches of a given type (`*`, `?`, `[abc]` globs)   |
| `gitwe current`                                                      | show information about the current topic branch                 |
| `gitwe graph`                                                        | show branch graph (base branches and topics)                    |
| `gitwe doctor [--fix] [--yes]`                                       | check repository health                                         |
| `gitwe validate [file]`                                              | validate a workflow definition                                  |
| `gitwe version`                                                      | print the gitwe version                                         |

Global options — `--config <path>`, `--cwd <path>`, `-v, --verbose`, `--no-color`, `--dry-run`, `--format <text|json|yaml|table>` — are accepted anywhere on the command line.

See [docs/commands.md](docs/commands.md) for every flag and
[docs/workflow-definition.md](docs/workflow-definition.md) for the definition format.

### Finishing a branch

`finish` is a state machine: merge (or squash/rebase) into the parent, tag it if the
topic type asks for it, update every auto-updating child branch, push if requested,
then delete the topic branch. If git stops on a conflict, gitwe saves its progress:

```bash
gitwe start feature login
# ... work, commit ...
gitwe finish login
# conflict: git merge stopped on conflicts in: src/app.ts

# ... resolve, then git add the files ...
gitwe finish --continue     # resume exactly where it stopped
gitwe finish --abort        # or roll every touched branch and tag back
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
and `GITWE_BASE`; a non-zero exit aborts the operation.

## Compatibility

gitwe drives the `git` binary directly, so it works with any git >= 2.30 and needs no
native modules. Definitions are plain JSON or YAML (`gitwe.json`, `.gitwe.yaml`, …),
which makes them reviewable and shareable across a team.

## License

[MIT](LICENSE) © Mohammad Amanalikhani
