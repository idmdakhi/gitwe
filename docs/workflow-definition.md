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
  "baseBranches": [ /* ... */ ],
  "topicTypes": [ /* ... */ ]
}
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `version` | `1` | `1` | definition format version |
| `name` | string | `custom` | workflow name, shown by `gitwe overview` |
| `remote` | string | `origin` | remote used by `publish`, `track` and `finish` |
| `tagPrefix` | string | `v` | prefix for tags created on finish |
| `hooks.enabled` | boolean | `true` | run hook scripts |
| `hooks.path` | string | `.gitwe/hooks` | hook directory, relative to the repo root |

## Base branches

Long-lived branches. They form a tree through `parent`; exactly one branch (the root)
has no parent.

```json
{
  "name": "develop",
  "parent": "main",
  "upstreamStrategy": "merge",
  "downstreamStrategy": "merge",
  "autoUpdate": true
}
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | string | — | git branch name |
| `parent` | string | — | base branch it integrates into |
| `upstreamStrategy` | `merge` \| `squash` \| `rebase` | `merge` | how it merges into its parent |
| `downstreamStrategy` | `merge` \| `rebase` | `merge` | how it is updated from its parent |
| `autoUpdate` | boolean | `false` | update it automatically whenever its parent receives a finish |

`autoUpdate` is what makes classic git-flow work: after a release or hotfix is merged
into `main`, `develop` is brought back in sync automatically.

## Topic types

Short-lived branch categories. Every topic type produces its own CLI command group.

```json
{
  "name": "release",
  "parent": "main",
  "startPoint": "develop",
  "prefix": "release/",
  "upstreamStrategy": "merge",
  "downstreamStrategy": "merge",
  "tag": true,
  "tagPrefix": "v",
  "deleteOnFinish": true
}
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | string | — | type name, also the CLI sub-command |
| `parent` | string | — | base branch the topic is finished into |
| `prefix` | string | `<name>/` | branch name prefix |
| `startPoint` | string | `parent` | branch new topics are created from |
| `upstreamStrategy` | `merge` \| `squash` \| `rebase` | `merge` | how `finish` integrates the topic |
| `downstreamStrategy` | `merge` \| `rebase` | `merge` | how `update` refreshes the topic |
| `tag` | boolean | `false` | create a tag on the parent when finishing |
| `tagPrefix` | string | workflow `tagPrefix` | prefix for that tag |
| `deleteOnFinish` | boolean | `true` | delete the topic branch after a successful finish |

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
remote: origin
tagPrefix: v
baseBranches:
  - name: main
  - name: develop
    parent: main
    autoUpdate: true
  - name: staging
    parent: develop
topicTypes:
  - name: feature
    parent: develop
    downstreamStrategy: rebase
  - name: spike
    parent: develop
    prefix: spike/
    upstreamStrategy: squash
  - name: release
    parent: main
    startPoint: develop
    tag: true
```

`gitwe spike start caching` and `gitwe spike finish --squash` exist as soon as the type
is in the file.
