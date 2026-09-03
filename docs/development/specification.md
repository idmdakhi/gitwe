# Git Workflow Specification (GitWS) — draft outline

**Status:** early draft — an outline, not filled-in prose. Nothing in this
document is implemented or binding; it does not describe gitwe's current
behaviour (see the [guides](../guides/commands.md) and
[workflow definition reference](../guides/workflow-definition.md) for that).

## Vision

A vendor-neutral specification for git branching workflows, where git-flow,
GitHub Flow, GitLab Flow, trunk-based development, and custom workflows are
all just *implementations* of the same underlying model — with gitwe as the
first reference implementation.

## Outline

The draft is organised as three volumes. Each part below is currently a
chapter list with no filled-in content; expanding a part into real prose is
a good first RFC-sized contribution.

### Volume 1 — Core specification

**Part I — Foundations**
1. Introduction (purpose, scope, terminology, conformance, compatibility)
2. Repository model (repository, working tree, index, `HEAD`, reference,
   ref namespace, branch, remote, tag, commit, merge base)
3. Workflow model (workflow, base branch, topic type, topic branch,
   lifecycle, operation, state, hook, policy, strategy)

**Part II — Configuration specification**
4. Configuration file (`gitws.json`/`gitws.yaml`/`gitws.yml`, `schemaVersion`)
5. Workflow metadata (`id`, `name`, `description`, `version`, `author`,
   `license`, `homepage`)
6. Repository settings (`defaultRemote`, `defaultBranch`, fetch/push/PR/tag
   policy)
7. Base branch definition (properties: `name`, `parent`, `remote`,
   `protected`, `strategy`, `permissions`)
8. Topic types (properties: `prefix`, `parent`, `keep`, `tag`, `strategy`,
   `hooks`, `metadata`)
9. Naming rules (regex, length, reserved names, case sensitivity, unicode,
   separator)
10. Policies (merge, delete, tag, publish, review, approval, protection)

**Part III — Command specification**
11. Global options (`--config`, `--cwd`, `--verbose`, `--json`, `--yaml`,
    `--color`, `--no-color`, `--dry-run`)
12–25. One chapter per command (`init`, `start`, `update`, `publish`,
    `track`, `finish`, `delete`, `rename`, `checkout`, `list`, `overview`,
    `doctor`, `validate`, `version`), each with lifecycle, preconditions,
    outputs, errors, examples. `finish`'s chapter is the one already
    sketched in most detail: validate → fetch → checkout → merge → tag →
    update → push → delete → cleanup.

### Volume 2 — Behavioural specification

**Part IV — State machine specification.** A formal branch lifecycle
(created → checked out → published → updating → ready → finishing → merged
→ tagged → deleted → archived, with failed/aborted as terminal error
states) and a formal `finish` state machine (idle → validate → pre-hook →
fetch → sync-check → checkout parent → merge → conflict → resume → tag →
push → delete remote → delete local → post-hook → completed), with every
transition formally defined.

**Part V — Hook specification.** Hook discovery paths, the full hook-name
list, and the hook contract (environment variables, stdin JSON context,
stdout/stderr, exit code). gitwe's current implementation of this part is
documented in the [hooks guide](../guides/hooks.md) — the environment
variable prefix there is `GITWE_*`, not `GITWS_*` as originally sketched
here; reconciling the two prefixes (or explicitly scoping the spec as
`GITWS_*` with gitwe mapping onto it) is an open question.

**Part VI — Merge strategy specification.** `merge`, `fast-forward`,
`no-ff`, `squash`, `rebase`, `rebase-merge`, `cherry-pick`, `ours`,
`theirs`, `custom` — each with its algorithm, rollback behaviour, resume
behaviour, and conflict policy. gitwe currently implements `merge`,
`squash`, and `rebase`; `cherry-pick` and `rebase-merge` are proposed in
[RFC-0002](./rfcs/0002-finish-strategies.md).

**Part VII — Remote specification.** Fetch, push, mirroring, multi-remote,
priority, fallback. gitwe's current implementation is documented in
[RFC-0001](./rfcs/0001-multi-remote.md) and the
[workflow definition reference](../guides/workflow-definition.md#remote-configuration).

**Part VIII — Tag specification.** Annotated, lightweight, signed,
semantic-version, and custom tag formats.

**Part IX — Conflict resolution.** (Not yet outlined beyond the title.)

**Part X — Error specification.** A formal error taxonomy — gitwe's current
approximation is the `GitweError` subclass hierarchy with stable `code`s,
described in [architecture overview](../architecture/overview.md#domain).

### Volume 3 — Interoperability specification

**Part XI — JSON Schema.** Formal schemas for the configuration file and
every command's machine-readable output; see
[RFC-0004](./rfcs/0004-machine-readable-output.md) for gitwe's current,
narrower version of this (a stable envelope shape, published schema
documents still outstanding).

**Part XII — Output specification.** Text, JSON, YAML, and table output
contracts.

**Part XIII — Library API.** The programmatic surface implementations
should expose — see gitwe's current `Engine` class
([architecture overview](../architecture/overview.md#application)) as one
concrete example.

**Part XIV — Extension specification.** How an implementation can be
extended without a general-purpose plugin system — see
["2.0 and later: extensibility"](./roadmap.md#20-and-later-extensibility)
for gitwe's current thinking here.

**Part XV — Workflow profiles.** Formal descriptions of `classic`
(git-flow), `github`, `gitlab`, and trunk-based profiles as instances of the
spec, so tools can validate "is this a valid GitHub Flow config" the same
way they validate config syntax.

**Part XVI — Compliance.** What it means for a tool to claim conformance
with a given spec version.

## Status and next steps

This is a long-term, exploratory document — not a near-term roadmap item.
If you want to help, picking one part and turning its chapter list into
actual prose (with examples, and cross-references to how gitwe currently
implements the equivalent behaviour) is more valuable than expanding the
outline further. Coordinate via an issue or discussion first, per the
[RFC process](./rfcs/README.md#process), since a full specification effort
is a significant undertaking.
