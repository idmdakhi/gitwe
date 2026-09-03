# RFC-0002: New Finish Strategies (Cherry-pick & Rebase-and-Merge)

| Field | Value |
| --- | --- |
| **Status** | Draft — not yet implemented |
| **Target** | 1.2 |
| **Priority** | Medium |
| **Related** | RFC-0001 (independent) |

## Summary

Extend `MergeStrategy` from its current three values (`merge`, `squash`,
`rebase`) to five, adding `cherry-pick` and `rebase-merge`.

## Motivation

Different teams have different history preferences:

| Strategy | Typical use case |
| --- | --- |
| `merge` | preserve full topic history (classic git-flow) |
| `squash` | one clean commit on the parent |
| `rebase` | linear history, no merge commit |
| `cherry-pick` | only selected commits (or all non-merge commits) |
| `rebase-merge` | linearise first, then create an explicit merge commit (GitHub's "Rebase and merge") |

The last two are frequently requested and currently require manual git
commands after `gitwe finish` has already run.

## Detailed design

### Type change

```ts
// domain/entities/workflow-config.entity.ts
export type MergeStrategy = "merge" | "squash" | "rebase" | "cherry-pick" | "rebase-merge";
```

Validation in the config validator updates accordingly. Existing definitions
remain valid — no default changes.

### Behaviour inside `FinishBranchUseCase`

**`cherry-pick`:**

1. After the remote-sync check, list commits reachable from the topic branch
   but not from the parent (`git rev-list parent..topic --no-merges`).
2. Check out the parent.
3. Cherry-pick those commits in order.
4. On conflict: stop, persist state, allow `--continue`/`--abort` exactly as
   the existing merge path does.

**`rebase-merge`:**

1. Rebase the topic onto the parent (same as today's `rebase` strategy).
2. Check out the parent.
3. `merge --no-ff` the now-rebased topic branch.
4. Conflict handling is identical to the existing merge path.

Both strategies participate in the same resumable state machine — snapshot,
tag, update, push, delete — described in
["The resumable finish operation"](../../architecture/overview.md#the-resumable-finish-operation).

### CLI

Existing flags continue to work and take precedence over the workflow
definition:

```
--squash
--rebase
--no-ff
```

New explicit flags, for clarity when neither existing flag maps cleanly:

```
--cherry-pick
--rebase-merge
```

### Layer impact

| Layer | Changes |
| --- | --- |
| `domain` | extend `MergeStrategy` union + validation |
| `application/use-cases/finish-branch.use-case.ts` | two new branches in the strategy switch, plus a helper to compute the non-merge commit list |
| `infrastructure/git` | a `cherryPick(commits)` method on `GitRepository`/`ShellGitRepository` |
| `cli` | document the new values; add the two new flags |
| `tests` | new cases in `tests/application/finish-branch.use-case.test.ts` |
| `docs` | [workflow-definition.md](../../guides/workflow-definition.md), [commands.md](../../guides/commands.md) |

### Backward compatibility

No change to existing strategy names or defaults; presets stay on `merge`/
`rebase` as they are today.

## Alternatives considered

1. **Only document the manual workaround.** Rejected — the whole point of
   gitwe is to encode the workflow, not leave a gap after `finish`.
2. **A separate `finishMode` field.** More flexible, but adds cognitive load
   for little benefit over extending the existing `MergeStrategy` enum.
3. **Support arbitrary shell strategies.** Too powerful for this scope;
   deferred to a possible future strategy-script RFC (see
   ["2.0 and later"](../roadmap.md#20-and-later-extensibility)).

## Acceptance criteria

- [ ] `finish --cherry-pick` produces only the topic branch's non-merge
      commits on the parent, in original order.
- [ ] `finish --rebase-merge` produces a rebased-then-merged history
      identical to running `rebase` followed by `merge --no-ff` by hand.
- [ ] Both strategies support `--continue`/`--abort` on conflict, matching
      the existing `merge`/`rebase` strategies.
- [ ] No behaviour change for definitions that don't opt into either new
      strategy.
