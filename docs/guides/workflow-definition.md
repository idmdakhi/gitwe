# Workflow definition reference

A gitwe workflow lives in a single JSON or YAML file. gitwe looks for it, in
this order, relative to the repository root:

```
gitwe.json  .gitwe.json  gitwe.yaml  gitwe.yml  .gitwe.yaml  .gitwe.yml
.gitwe/gitwe.yaml  .gitwe/gitwe.yml  .gitwe/gitwe.json
```

`gitwe init` writes `.gitwe/gitwe.yaml`. Use `-C, --config <path>` to point
gitwe at any other file. Every write goes through the same structural
validation described below — including edits made with `gitwe config`.

```yaml
version: 1
name: classic
baseBranches: [ ... ]
branchTypes: [ ... ]
merge: { ... }        # optional
hooks: { ... }         # optional
versioning: { ... }     # optional
remote: { ... }          # optional
changelog: { ... }        # optional
cli: { ... }                # optional
```

| Field | Type | Description |
| --- | --- | --- |
| `version` | `1` | definition format version |
| `name` | string | workflow name, shown by `gitwe overview` |
| `baseBranches` | array | required — see below |
| `branchTypes` | array | required — see below |
| `merge` | object | merge strategy and branch retention on `finish` |
| `hooks` | object | hook script configuration, see [hooks](./hooks.md) |
| `versioning` | object | tag/version-bump behaviour on `finish` |
| `remote` | object | which remotes to fetch/push, with per-branch/type overrides |
| `changelog` | object | `{ enabled, config? }` — reserved for future changelog generation |
| `cli` | object | `{ enabled, interactive?, color?, aliases? }` — CLI-only preferences, including custom command aliases |

## Base branches

Long-lived branches. They form a tree through `base`: exactly one branch (the
root) omits `base`.

```yaml
baseBranches:
  - name: main
    aliases: [master]
    protected: true
  - name: develop
    aliases: [dev]
    base: main
    protected: true
```

| Field | Type | Description |
| --- | --- | --- |
| `name` | string | git branch name |
| `base` | string | parent base branch this one integrates into; omit only for the root |
| `aliases` | string[] | alternate names accepted wherever this branch is referenced |
| `protected` | boolean | when true, gitwe refuses to delete or force-push this branch |

The `base` chain is what makes classic git-flow work: after a release or
hotfix is merged into `main`, `develop` is brought back in sync as one of the
type's `target`s.

## Branch types

Short-lived topic-branch categories. Every branch type becomes usable with
`gitwe start <type>`, `gitwe finish`, etc.

```yaml
branchTypes:
  - name: release
    aliases: [rel]
    base: develop
    target: [main, develop]
    prefix: release/
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | string | — | type name, also the CLI argument |
| `aliases` | string[] | — | alternate names accepted for `<type>` arguments |
| `base` | string | — | base branch new topics of this type are created from |
| `target` | string[] | — | base branch(es) this type is merged into on `finish` (a `release` typically targets both `main` and `develop`) |
| `prefix` | string | `<name>/` | branch-name prefix |
| `pushRemote` | string | workflow's default remote | override which remote this type pushes to |

Validation is strict and runs before anything is written or executed
(including `gitwe config` edits):

- exactly one root base branch (no `base` field);
- no duplicate base-branch or branch-type names, case-insensitive;
- no cycles in the base-branch tree;
- every `base`/`target` reference points at a base branch that exists;
- every prefix ends with `/` and is unique across branch types;
- `merge.deleteOnFinish` / `merge.branchTypes` only reference known types;
- `remote.baseOverrides` / `remote.typeOverrides` only reference known base
  branches / types, and any `remote` named in an override is listed in the
  workflow's `fetch`/`push` lists;
- `versioning.tagTargets` only references known base branches.

## Presets

`gitwe init --preset <name>` writes one of:

| Preset | Base branches | Branch types | Merge |
| --- | --- | --- | --- |
| `classic` | `main` ← `develop` | `feature` → develop, `release`/`hotfix` → main+develop, `support` → main | merge commits; `feature` squash-eligible |
| `github` | `main` | `feature`, `bugfix` → main | squash |
| `gitlab` | `main` ← `staging` ← `production` | `feature` → main, `hotfix` → production+main | merge commits |

Presets are a starting point: edit the file directly, or use
`gitwe config add|edit|rename|delete` (see the
[command reference](./commands.md#gitwe-config-subcommand)).

## Example: a custom workflow

```yaml
version: 1
name: acme
baseBranches:
  - name: main
    protected: true
  - name: develop
    base: main
  - name: staging
    base: develop
branchTypes:
  - name: feature
    base: develop
    target: [develop]
  - name: spike
    base: develop
    target: [develop]
    prefix: spike/
  - name: release
    base: develop
    target: [main, develop]
```

`gitwe start spike caching` and `gitwe finish spike/caching --squash` work as
soon as the type is in the file — no further wiring needed.

## Merge

Controls how `finish` merges a topic branch and what happens to it afterward.

```yaml
merge:
  strategy: merge          # merge | squash | rebase, default per-type below
  branchTypes:
    feature: squash         # per-type override of `strategy`
  deleteOnFinish: [feature, release, hotfix]
  squash:
    enabled: true
    default: false           # if true, squash is the default even without --squash
    branchTypes: [feature]     # types eligible for --squash
```

| Field | Type | Description |
| --- | --- | --- |
| `strategy` | `merge` \| `squash` \| `rebase` | default merge strategy |
| `branchTypes` | map | per-branch-type strategy override |
| `deleteOnFinish` | string[] | branch types deleted after a successful `finish` |
| `squash.enabled` | boolean | whether `--squash` is accepted at all |
| `squash.default` | boolean | squash without needing `--squash` |
| `squash.branchTypes` | string[] | branch types that may be squash-merged |

## Versioning

Controls automatic tag creation and version bumping on `finish`.

```yaml
versioning:
  enabled: true
  tagPrefix: v
  tagTypes: [release, hotfix]        # branch types that get tagged
  tagTargets: [root]                 # or: target branches that trigger tagging; "root" = the root base branch
  bumpRules:
    minor: [release]
    patch: [hotfix]
```

| Field | Type | Description |
| --- | --- | --- |
| `enabled` | boolean | enable versioning (default `false`) |
| `config` | string | path to a separate version-config file, merged over these fields |
| `tagPrefix` | string | tag prefix (default `v`) |
| `tagTypes` | string[] | branch types that get tagged on finish |
| `tagTargets` | string[] | target branches that trigger tagging; `"root"` means the root base branch |
| `bumpRules` | object | `{ major?, minor?, patch?, prerelease? }`, each a list of branch-type names |
| `format` | string | tag format template, e.g. `"{{tagPrefix}}{{major}}.{{minor}}.{{patch}}"` |
| `annotated` | boolean | create annotated tags |
| `sign` / `signingKey` | boolean / string | GPG-sign tags |
| `pushTags` | boolean | push tags along with the branch |
| `autoCommit` / `commitMessage` | boolean / string | commit a version bump automatically |
| `prerelease` | object | `{ enabled, format, types }` for prerelease tags (`alpha`, `beta`, `rc`, ...) |

A branch gets tagged if **either** condition holds — `tagTypes` and
`tagTargets` are additive, not exclusive:

```yaml
# Type-based only (classic git-flow)
versioning: { enabled: true, tagTypes: [release, hotfix], bumpRules: { minor: [release], patch: [hotfix] } }

# Target-based only (GitHub Flow: tag every merge to main)
versioning: { enabled: true, tagTargets: [root], bumpRules: { patch: [feature] } }

# Both
versioning: { enabled: true, tagTypes: [release], tagTargets: [root] }
```

`gitwe finish` flags (`--tag`/`--no-tag`, `--tagname`, `--current-version`,
`--major`/`--minor`/`--patch`) override this configuration for a single run
— see the [command reference](./commands.md#gitwe-finish-name).

## Remote configuration

```yaml
remote:
  default: origin
  fetch: [origin]
  push: [origin]
  autoFetch: true
  autoPush: false            # still requires --push on finish
  pushOptions:
    forceWithLease: false
    followTags: true
  baseOverrides:
    develop:
      remote: upstream
      fetch: [upstream]
  typeOverrides:
    release:
      push: [upstream]
      autoPush: true
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `default` | string | `origin` | primary remote name |
| `fetch` | string[] | `[origin]` | remotes to fetch from |
| `push` | string[] | `[origin]` | remotes to push to |
| `autoFetch` | boolean | `true` | fetch before operations that need up-to-date refs |
| `autoPush` | boolean | `false` | push after finish — `gitwe finish` still requires `--push` |
| `pushOptions.forceWithLease` | boolean | `false` | use `--force-with-lease` for pushes |
| `pushOptions.followTags` | boolean | `true` | push tags along with branches |
| `baseOverrides.<branch>` | object | — | override remote settings when working from this base branch |
| `typeOverrides.<type>` | object | — | override remote settings for this branch type |

Overrides resolve type → base → global, highest priority first: a
`typeOverrides.<type>` setting wins over `baseOverrides.<base>`, which wins
over the global fields above.

## Hooks

Referenced from the top-level `hooks` field. See the dedicated
[hooks guide](./hooks.md) for the full lifecycle, `when` conditions,
environment variables, and inline vs. filesystem vs. type-scoped hooks.
