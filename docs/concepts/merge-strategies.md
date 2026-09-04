# Merge Strategies

When you run `gitwe finish`, gitwe merges the topic branch into its target. You can control *how* this merge happens using the `merge.strategy` field in the workflow definition or via CLI flags.

## Available Strategies

### 1. `merge` (Default)
Creates a standard merge commit. Preserves the full history of the topic branch.

```yaml
merge:
  strategy: merge
```

**Result:** A new commit with two parents (the target and the topic).

### 2. `squash`
Squashes all commits from the topic branch into a single commit on the target.

```yaml
merge:
  strategy: squash
```

**Result:** One new commit on the target containing all changes. The topic branch is deleted.

**Use when:** You want a clean, linear history and the individual commits on the feature are not important.

### 3. `rebase`
Rebases the topic branch onto the target, then fast-forwards the target to the rebased commit.

```yaml
merge:
  strategy: rebase
```

**Result:** A linear history. The commits are re-written (new hashes).

**Use when:** You strictly enforce a linear, clean Git history.

### 4. `cherry-pick` (P2 – Planned)
Cherry-picks the commits from the topic branch onto the target, one by one.

```yaml
merge:
  strategy: cherry-pick
```

**Result:** Copies of the commits on the target.

**Use when:** You want to selectively port changes without merging the entire branch context.

### 5. `rebase-merge` (P2 – Planned)
Rebases the topic branch onto the target, but then creates a merge commit (like `--no-ff`).

```yaml
merge:
  strategy: rebase-merge
```

**Result:** Linear history with a merge commit marker.

**Use when:** You want traceability of the merge event while avoiding clutter.

## CLI Override

You can override the strategy per command:

```bash
gitwe finish feature/login --strategy squash
```

## Conflict Handling

All strategies support the **resumable** conflict state. If a conflict occurs:

1. Resolve the conflict.
2. Run `gitwe finish --continue`.

The strategy is preserved across the resume.
