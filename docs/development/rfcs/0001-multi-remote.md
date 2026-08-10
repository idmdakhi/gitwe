# RFC-0001: Multi-Remote & Remote Strategy

| Field         | Value             |
| ------------- | ----------------- |
| **Status**    | Draft             |
| **Date**      | 2026-08-01        |
| **Target**    | 1.2               |
| **Priority**  | Medium-High       |
| **Author(s)** | gitwe maintainers |
| **Related**   | —                 |

## Summary

Add first-class support for multiple remotes and configurable push/fetch strategies at both the workflow level and the individual base-branch / topic-type level, while remaining 100 % backward-compatible with the current single-string `remote` field.

## Motivation

Many real-world repositories use more than one remote:

- `origin` (team fork) + `upstream` (canonical)
- `origin` + a mirror (`mirror`, `backup`, GitLab mirror, etc.)
- Different remotes for different long-lived branches

Today gitwe only understands a single `remote` string.  
`finish --push`, `publish` and `track` are hard-wired to that one remote.  
Teams either work around the limitation with custom scripts or simply do not use the push-related features.

## Detailed Design

### Configuration shape

Two forms are accepted (backward compatible):

```yaml
# Legacy (still valid)
remote: origin
```

```yaml
# New form
remote:
  default: origin
  fetch: [origin] # optional, defaults to [default]
  push: [origin, mirror] # optional, defaults to [default]
```

Optional per-branch / per-topic overrides:

```yaml
baseBranches:
  - name: main
    remote: origin # used for push of this base branch

branchTypes:
  - name: feature
    pushRemote: origin # used by publish & finish --push
```

### Resolution rules

1. If a topic type defines `pushRemote` → use it.
2. Else if the parent base branch defines `remote` → use it.
3. Else use `remote.default` (or the legacy string).
4. For `fetch` the workflow-level `fetch` list is always used (or `[default]`).

### Engine behaviour

- `publish` and the push step of `finish` iterate over the resolved push list.
- Order is significant: remotes are pushed sequentially.
- Failure policy (first version): **fail-fast**. A later RFC may add `onError: continue | fail`.
- `track` and the remote-sync check continue to use the primary (`default`) remote only.

### CLI additions

```
gitwe feature publish [name] --remote <name>
gitwe finish [name] --push --remote <name>
gitwe finish [name] --push --push-to origin,mirror
```

`--remote` / `--push-to` override the definition for that single invocation.

### Layer impact

| Layer                     | Changes                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `domain/entities.ts`      | New types `RemoteConfig`, optional `remote` / `pushRemote` fields       |
| `domain/config/parse.ts`  | Accept string **or** object; normalise to internal `RemoteConfig`       |
| `domain/config/editor.ts` | Support editing the new fields                                          |
| `domain/workflow.ts`      | Helpers `resolvePushRemotes(topic)`, `resolveFetchRemotes()`            |
| `application`             | `FinishOperation`, `publish`, `track` use the helpers                   |
| `infrastructure`          | `ShellGitRepository.push` already accepts a single remote; caller loops |
| `cli`                     | New flags on `publish` / `finish`                                       |
| tests                     | Expand `tests/engine/remote.test.ts`                                    |

### Migration

- Existing `gitwe.json` / YAML files continue to work unchanged.
- `gitwe config` will still accept the old form.
- Documentation and the three presets stay on the simple string form until 1.3.

## Alternatives Considered

1. **CLI-only override** (`--remote`)  
   Simpler, but does not solve the “always push to two remotes” case.

2. **Full per-branch remote map from day one**  
   More flexible, higher complexity, harder to keep backward-
   ...
