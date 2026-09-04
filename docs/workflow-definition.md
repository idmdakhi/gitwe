# Workflow definition reference

A gitwe workflow lives in a single JSON or YAML file at the root of the repository.
gitwe looks for, in order: `gitwe.json`, `.gitwe.json`, `gitwe.yaml`, `gitwe.yml`,
`.gitwe.yaml`, `.gitwe.yml`. Use `--config <path>` to point at any other file.

```jsonc
{
  "version": 1,
  "name": "classic",
  "remote": "origin",
  "tagPrefix": "v",
  "hooks": { "enabled": true, "path": ".gitwe/hooks" },
  "baseBranches": [
    /* ... */
  ],
  "branchTypes": [
    /* ... */
  ],
}
```

| Field           | Type    | Default        | Description                                    |
| --------------- | ------- | -------------- | ---------------------------------------------- |
| `version`       | `1`     | `1`            | definition format version                      |
| `name`          | string  | `custom`       | workflow name, shown by `gitwe overview`       |
| `remote`        | string  | `origin`       | remote used by `publish`, `track` and `finish` |
| `tagPrefix`     | string  | `v`            | prefix for tags created on finish              |
| `hooks.enabled` | boolean | `true`         | run hook scripts                               |
| `hooks.path`    | string  | `.gitwe/hooks` | hook directory, relative to the repo root      |

## Base branches

Long-lived branches. They form a tree through `parent`; exactly one branch (the root)
has no parent.

```json
{
  "name": "develop",
  "parent": "main"
}
```

| Field    | Type   | Default | Description                    |
| -------- | ------ | ------- | ------------------------------ |
| `name`   | string | —       | git branch name                |
| `parent` | string | —       | base branch it integrates into |

``is what makes classic git-flow work: after a release or hotfix is merged
into`main`, `develop` is brought back in sync automatically.

## Topic types

Short-lived branch categories. Every topic type produces its own CLI command group.

```json
{
  "name": "release",
  "base": "main",
  "target": "develop",
  "prefix": "release/"
}
```

| Field    | Type   | Default   | Description                            |
| -------- | ------ | --------- | -------------------------------------- |
| `name`   | string | —         | type name, also the CLI sub-command    |
| `base`   | string | —         | base branch the topic is finished into |
| `prefix` | string | `<name>/` | branch name prefix                     |
| `target` | string | `base`    | branch new topics are created from     |

Validation is strict: unknown parents, duplicate names, shared prefixes, invalid
strategies and cycles in the base branch tree are all rejected before anything runs —
also when editing through `gitwe config`.

## Presets

`gitwe init --preset <name>` writes one of:

- **classic** — `main` + `develop`; `feature`, `bugfix`, `release`, `hotfix`, `support`.
- **github** — `main` only; `feature` and `bugfix`, rebased on update.
- **gitlab** — `main`, `staging` (auto-updated), `production`; `feature` and `hotfix`.

Presets are a starting point: edit the file, or use `gitwe config add|edit|rename|delete`.

## Example: a custom workflow

```yaml
version: 1
name: acme
baseBranches:
  - name: main
  - name: develop
    base: main
  - name: staging
    base: develop
branchTypes:
  - name: feature
    base: develop
  - name: spike
    base: develop
    prefix: spike/
  - name: release
    base: main
    target: develop
```

`gitwe start spike caching` and `gitwe finish spike --squash` exist as soon as the type
is in the file.

## Versioning

Controls automatic tag creation and version bumping on `finish`.

| Field        | Type       | Description                                                                               |
| ------------ | ---------- | ----------------------------------------------------------------------------------------- |
| `enabled`    | `boolean`  | Enable versioning (default: `false`)                                                      |
| `file`       | `string`   | Path to a separate version config file (optional)                                         |
| `tagPrefix`  | `string`   | Prefix for tags (default: `v`)                                                            |
| `tag`        | `string[]` | **Type-based**: topic types that get tagged on finish (e.g., `["release", "hotfix"]`)     |
| `tagTargets` | `string[]` | **Target-based**: target branches that trigger tagging. Use `"root"` for the root branch. |
| `bumpRules`  | `object`   | Rules for version bump: `major`, `minor`, `patch`, `prerelease`                           |

### Separate version file

You can move advanced settings to a separate file (e.g., `.gitwe/version.yaml`):

```yaml
# .gitwe/version.yaml
tagPrefix: v
format: "{{tagPrefix}}{{major}}.{{minor}}.{{patch}}"
annotated: true
pushTags: false
autoCommit: true
commitMessage: "chore: bump version to {{version}}"
prerelease:
  enabled: false
  format: "{{type}}.{{number}}"
  types: ["alpha", "beta", "rc"]
```

Tagging logic
Tagging occurs if any of these conditions is true:

The topic type is listed in tag.

Any of the merge targets is listed in tagTargets (or is the root branch).

This is an OR logic, so both can work together.

Examples
Type-based only (classic git-flow):

```yaml
versioning:
  enabled: true
  tag: [release, hotfix]
  bumpRules:
    minor: [release]
    patch: [hotfix]

# Target-based only (GitHub Flow):
versioning:
  enabled: true
  tagTargets: [root]
  bumpRules:
    patch: [feature]
# Both (release types get tagged, and any merge to main also gets tagged):
versioning:
  enabled: true
  tag: [release]
  tagTargets: [root]

```
