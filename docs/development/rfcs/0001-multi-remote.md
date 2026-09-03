# RFC-0001: Multi-Remote & Remote Strategy

| Field | Value |
| --- | --- |
| **Status** | Implemented |
| **Target** | 1.2 |
| **Priority** | Medium-High |

## Summary

Add first-class support for multiple remotes and configurable push/fetch
strategies at both the workflow level and the individual base-branch / topic
-type level, while remaining backward-compatible with a single-remote setup.

## Motivation

Many real-world repositories use more than one remote:

- `origin` (team fork) + `upstream` (canonical)
- `origin` + a mirror (`mirror`, `backup`, a GitLab mirror, ...)
- Different remotes for different long-lived branches

A single hard-wired remote forces teams to work around the limitation with
custom scripts, or to simply not use gitwe's push-related features.

## Design (as implemented)

### Configuration shape

```yaml
remote:
  default: origin
  fetch: [origin]
  push: [origin, mirror]
  autoFetch: true
  autoPush: false
  pushOptions:
    forceWithLease: false
    followTags: true
```

Per-base-branch and per-branch-type overrides:

```yaml
remote:
  baseOverrides:
    develop:
      remote: upstream
      fetch: [upstream]
  typeOverrides:
    release:
      push: [upstream]
      autoPush: true
```

See the full field list in the
[workflow definition reference](../../guides/workflow-definition.md#remote-configuration).

### Resolution rules

Overrides resolve type → base → global, highest priority first:
`typeOverrides.<type>` wins over `baseOverrides.<base>`, which wins over the
top-level `remote` fields.

### Engine behaviour

- `publish` and the push step of `finish` iterate over the resolved push
  list; remotes are pushed sequentially.
- Failure policy: fail-fast on the first remote that fails to push.
- Validation requires every remote named in an override to also appear in
  the workflow's `fetch`/`push` lists (see
  [`ConfigValidatorService`](../../architecture/overview.md#domain)).

### Layer impact

| Layer | Changes |
| --- | --- |
| `domain/entities/remote-config.entity.ts` | `RemoteConfig`, `RemoteOverride`, `BaseRemoteOverrides`, `TypeRemoteOverrides` |
| `domain/services/workflow.service.ts` | Remote resolution helpers used by `finish`/`publish`/`track` |
| `domain/services/config-validator.service.ts` | Validates override references |
| `infrastructure/config/remote-config-loader.ts` | Merges an optional external `remote.config` file over the inline section |
| `infrastructure/git/shell-git-repository.adapter.ts` | `push()` accepts a single remote; callers loop over the resolved list |

### Migration

Existing single-remote definitions (`remote: origin`, or an already-plain
`remote: { default, fetch, push }` object) continue to work unchanged.
`gitwe config` accepts both.

## Alternatives considered

1. **CLI-only override (`--remote`)** — simpler, but doesn't solve the
   "always push to two remotes" case.
2. **Full per-branch remote map from day one** — more flexible, but harder
   to keep backward-compatible with the simple string form; the
   type/base-override shape shipped instead covers the same cases with less
   surface area.
