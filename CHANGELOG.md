# Changelog

All notable changes to this project are documented in this file.

## [1.0.0] - 2026-07-31

First stable release. gitwe was rewritten from scratch as a focused git workflow
engine; the pre-1.0 code base is not carried over and no upgrade path is provided.

### Added

- **Workflow definition (v1)** — base branches with a parent tree, ``
  back-merges, and topic types with prefix, start point, merge/update strategies,
  tagging and retention. Strict validation of parents, prefixes, strategies and cycles.
- **Presets** — `classic` (git-flow), `github` and `gitlab`, written by `gitwe init`.
- **Engine** — `start`, `finish`, `update`, `publish`, `track`, `list`, `checkout`,
  `rename`, `delete` and `overview`, usable as a typed library API.
- **Resumable finish** — the finish state machine persists its progress in
  `.gitwe/operation.json`, so `--continue` resumes after conflicts and `--abort`
  restores every touched branch and tag.
- **Remote safety** — `finish` fetches and refuses to run when the topic branch is
  behind its remote tracking branch unless `--force` is given.
- **Generated CLI** — every topic type in the definition gets its own command group,
  plus git-flow style shorthands (`gitwe finish`, `gitwe update`, `gitwe rebase`, …).
- **Hooks** — `pre-/post-` scripts for start, finish, update, publish and delete.
- **`gitwe overview --format json|yaml`** for CI and tooling.

### Removed

- Plugin system, Slack notifier, GitHub Action, changelog/version-bump automation,
  conventional-commit policies and the update checker — out of scope for a workflow
  engine.
- The `simple-git` and `zod` dependencies; gitwe now drives the `git` binary directly
  and validates definitions itself. The package is ESM and requires Node.js >= 20.
