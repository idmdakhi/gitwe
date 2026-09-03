# Quickstart

## 1. Install

```bash
npm install -g gitwe
```

Requires **Node.js ≥ 20** and `git` on `PATH`.

## 2. Initialise a workflow

Run this at the root of a git repository:

```bash
gitwe init
```

In an interactive terminal (and without `--defaults`), this launches a short
wizard: pick a preset, optionally rename base branches or type prefixes,
choose a remote, toggle versioning and hooks, then confirm. It writes
`.gitwe/gitwe.yaml` and creates any missing base branches (`main`, `develop`
for the `classic` preset).

For a non-interactive, scriptable run (CI, or if you just want the preset
defaults):

```bash
gitwe init --preset classic --defaults
```

Available presets:

| Preset | Base branches | Topic types |
| --- | --- | --- |
| `classic` (default) | `main`, `develop` | `feature`, `release`, `hotfix`, `support` |
| `github` | `main` | `feature`, `bugfix` (squash-merged) |
| `gitlab` | `main`, `staging`, `production` | `feature`, `hotfix` |

Presets are a starting point — edit `.gitwe/gitwe.yaml` directly, or use
`gitwe config add|edit|rename|delete` to change it from the CLI. See the
[workflow definition reference](./workflow-definition.md) for the full
schema.

## 3. Work on a topic branch

```bash
gitwe start feature login       # creates + checks out feature/login
git commit -am "add login form"
gitwe update feature/login      # merge (or --rebase) the latest base in
gitwe publish feature/login     # push and set upstream
```

`gitwe overview` (alias `status`) shows the workflow name, current branch,
configured base branches, and a per-type branch count. `gitwe current` shows
just the resolved type/base/target for whatever's checked out.

## 4. Finish the branch

```bash
gitwe finish feature/login --push
```

This merges `feature/login` into its configured target(s) (`develop` for a
`classic` feature), optionally tags and pushes, and deletes the local (and,
with `--keep-remote` unset, remote) topic branch — all governed by the
workflow definition and any flags you pass. See
[`gitwe finish`](./commands.md#gitwe-finish-name) for the full flag set.

If a merge conflict stops `finish` partway through, gitwe persists progress
to `.git/gitwe/operation.json`. Resolve the conflict, then run
`gitwe finish --continue` (this can be a separate process/terminal) or
`gitwe finish --abort` to roll back everything the operation touched so far.

## 5. Everyday commands

```bash
gitwe list                      # every topic branch, resolved against the workflow
gitwe list feature              # just feature/* branches
gitwe types                     # topic types defined in the active workflow
gitwe track feature login       # create a local branch tracking origin/feature/login
gitwe delete feature/login -r   # delete local + remote branch
gitwe validate                  # check the workflow definition itself
gitwe doctor                    # check repository health against the definition
```

See the [full command reference](./commands.md) for every command gitwe
ships, and [hooks](./hooks.md) for running scripts around any of them.
