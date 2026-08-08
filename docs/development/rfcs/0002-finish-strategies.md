# RFC-0002: New Finish Strategies (Cherry-pick & Rebase-and-Merge)

| Field         | Value                  |
| ------------- | ---------------------- |
| **Status**    | Draft                  |
| **Date**      | 2026-08-01             |
| **Target**    | 1.2                    |
| **Priority**  | Medium                 |
| **Author(s)** | gitwe maintainers      |
| **Related**   | RFC-0001 (independent) |

## Summary

Extend the `` vocabulary of topic types from the current three values (`merge`, `squash`, `rebase`) to five values by adding `cherry-pick` and `rebase-merge`.

## Motivation

Different teams have different history preferences:

| Strategy       | Typical use-case                                                                  |
| -------------- | --------------------------------------------------------------------------------- |
| `merge`        | Preserve full topic history (classic git-flow)                                    |
| `squash`       | One clean commit on the parent                                                    |
| `rebase`       | Linear history, no merge commit                                                   |
| `cherry-pick`  | Only selected commits (or all non-merge commits)                                  |
| `rebase-merge` | Linearise first, then create an explicit merge commit (GitHub “Rebase and merge”) |

The last two are frequently requested and currently require manual git commands after `gitwe` has finished.

## Detailed Design

### Type change

```ts
// domain/entities.ts
export type MergeStrategy = "merge" | "squash" | "rebase" | "cherry-pick" | "rebase-merge";
```

Validation in `parse.ts` is updated accordingly.  
Existing definitions remain valid.

### Behaviour inside `FinishOperation`

#### `cherry-pick`

1. After the remote-sync check, list commits that are reachable from the topic branch but not from the parent (`git rev-list parent..topic --no-merges`).
2. Check out the parent.
3. Cherry-pick those commits in order.
4. On conflict → stop, persist state, allow `--continue` / `--abort` exactly as today.

#### `rebase-merge`

1. Rebase the topic onto the parent (same as today’s `rebase` strategy).
2. Check out the parent.
3. Perform a `merge --no-ff` of the (now rebased) topic branch.
4. Conflict handling stays identical to the existing merge path.

Both new strategies participate in the same state machine, snapshotting and tag/update/push/delete steps.

### CLI

The existing flags continue to work and take precedence over the definition:

```
--squash
--rebase
--no-ff
```

New explicit flags (optional, for clarity):

```
--cherry-pick
--rebase-merge
```

### Layer impact

| Layer                            | Changes                                                          |
| -------------------------------- | ---------------------------------------------------------------- |
| `domain`                         | Extend `MergeStrategy` union + validation                        |
| `application/use-case/finish.ts` | Two new branches in the strategy switch + helper for commit list |
| `infrastructure/git`             | Possibly a thin `cherryPick(commits)` helper on `GitRepository`  |
| `cli`                            | Document the new values; optional new flags                      |
| tests                            | New cases in `tests/engine/finish.test.ts`                       |
| docs                             | `workflow-definition.md`, `commands.md`                          |

### Backward compatibility

- No change to existing strategy names or defaults.
- Presets stay on `merge` / `rebase` as they are today.

## Alternatives Considered

1. **Only document the manual workaround**  
   Rejected – the whole point of gitwe is to encode the workflow.

2. **Introduce a completely separate `finishMode` field**  
   More flexible but adds cognitive load; extending the existing enum is simpler.

3. **Support arbitrary shell strategies**  
   Too powerful for 1.2; deferred to a possible future plugin/strategy-script RFC.

## Acceptance Criteria

- [ ] `: cherry-pick` produces only the topic’s non-merge commits on the parent.
- [ ] `: rebase-me
      ...
