# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

The commands and flags below are present in `src/` and wired into
`src/cli/program.ts` today, but were never given a changelog entry after
1.0.0. Listed here for accuracy — see the [roadmap](./docs/development/roadmap.md)
for what's still outstanding on each.

### Added

- **`gitwe doctor`** — repository health checks (config validity, detached
  `HEAD`, missing base branches, stale operation state, branches without an
  upstream, dirty working tree) with a safe `--fix`/`--yes` repair mode
  ([RFC-0003](./docs/development/rfcs/0003-doctor-auto-repair.md)).
- **Machine-readable output everywhere** — `--format text|json|yaml|table`
  on every command, wrapping results in a versioned
  `{ schemaVersion, command, ok, data, warnings, error }` envelope
  ([RFC-0004](./docs/development/rfcs/0004-machine-readable-output.md)).
  `table` currently renders the same as `text`.
- **Multi-remote support** — `remote.fetch`/`remote.push` lists, plus
  per-base-branch and per-branch-type overrides
  ([RFC-0001](./docs/development/rfcs/0001-multi-remote.md)).
- **`gitwe config`** — `list`/`add`/`edit`/`rename`/`delete` subcommands to
  edit the workflow definition without hand-editing YAML.
- **`gitwe track`** and **`gitwe rename`** — create a local branch tracking
  a remote-only topic branch, and rename the current topic branch's short
  name.
- **`gitwe checkout`, `current`, `graph`, `log`, `tag`, `rebase`, `abort`,
  `clean`, `sync`, `pull`** — rounding out the CLI surface beyond the
  original `start`/`finish`/`update`/`publish`/`delete`/`overview` set.
- **Interactive `gitwe init` wizard** — preset selection, base-branch and
  prefix renaming, remote, versioning and hook setup, with `--defaults` or
  `--format json|yaml` to skip straight to the non-interactive path.
- **Versioning** — `bumpRules`, `tagTargets`, prerelease format, and
  GPG signing options on top of the original tag-on-finish support.
- **Hooks** — `when` conditions, `stdin: true` JSON context (with the
  ability to block an operation via `{ "continue": false }`), `parallel`
  and `continueOnError`, and per-branch-type hook overrides, on top of the
  original plain `pre-`/`post-` script support.
- A root `action.yaml` GitHub Action (see the compatibility notice in
  [docs/guides/ci.md](./docs/guides/ci.md#the-official-github-action) —
  its flag mapping hasn't been updated to match the CLI above yet).

## [1.0.0] - 2026-07-31

First stable release. gitwe was rewritten from scratch as a focused git
workflow engine; the pre-1.0 codebase was not carried over and no upgrade
path was provided.

### Added

- **Workflow definition (v1)** — base branches with a parent tree and
  back-merges, and topic types with prefix, start point, merge/update
  strategies, tagging and retention. Strict validation of parents, prefixes,
  strategies and cycles.
- **Presets** — `classic` (git-flow), `github` and `gitlab`, written by
  `gitwe init`.
- **Engine** — `start`, `finish`, `update`, `publish`, `track`, `list`,
  `checkout`, `rename`, `delete` and `overview`, usable as a typed library
  API.
- **Resumable finish** — the finish state machine persists its progress in
  `.git/gitwe/operation.json`, so `--continue` resumes after conflicts and
  `--abort` restores every touched branch and tag.
- **Remote safety** — `finish` fetches and refuses to run when the topic
  branch is behind its remote tracking branch, unless `--force` is given.
- **Generated CLI** — every topic type in the definition gets its own
  command group, plus git-flow-style shorthands (`gitwe finish`,
  `gitwe update`, `gitwe rebase`, ...).
- **Hooks** — `pre-`/`post-` scripts for start, finish, update, publish and
  delete.
- **`gitwe overview --format json|yaml`** for CI and tooling.

### Removed

- Plugin system, Slack notifier, GitHub Action, changelog/version-bump
  automation, conventional-commit policies and the update checker — judged
  out of scope for a focused workflow engine at the time. (The GitHub
  Action returned post-1.0; see "Unreleased" above.)
- The `simple-git` and `zod` dependencies; gitwe drives the `git` binary
  directly and validates definitions itself. The package is ESM and
  requires Node.js >= 20.
