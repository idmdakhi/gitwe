# Migration Guide

Migrate from `nvie/gitflow`, `gitflow-avh`, or `git-flow-next` to `gitwe`.

## Terminology Mapping

| Legacy Concept | gitwe Concept | Notes |
| :--- | :--- | :--- |
| `git flow init` | `gitwe init` | gitwe uses a YAML file instead of interactive prompts. Use `--preset` to mimic classic flows. |
| `git flow feature start` | `gitwe start feature` | Same syntax. |
| `git flow feature finish` | `gitwe finish feature` | gitwe adds `--continue`/`--abort` for conflicts. |
| `git flow release start` | `gitwe start release` | Version bumping is configurable in `versioning`. |
| `git flow hotfix start` | `gitwe start hotfix` | Same syntax. |
| `git flow support start` | `gitwe start support` | Supported in the `classic` preset. |
| `git flow publish` | `gitwe publish` | Sets upstream. |
| `git flow track` | `gitwe track` | (Currently being wired up in P2). |
| `git flow rename` | `gitwe rename` | (Currently being wired up in P2). |

## Configuration File Differences

**Legacy (`.gitflow`):**
```
[gitflow "branch"]
    master = main
    develop = develop
[gitflow "prefix"]
    feature = feature/
    release = release/
    hotfix = hotfix/
```

**gitwe (`.gitwe/gitwe.yaml`):**
```yaml
schemaVersion: 1
baseBranches:
  - name: main
  - name: develop
branchTypes:
  - name: feature
    extends: develop
    target: develop
    prefix: feature/
  - name: release
    extends: develop
    target: main
    prefix: release/
  - name: hotfix
    extends: main
    target: main
    prefix: hotfix/
```

## Command Behavior Changes

1. **Conflict Handling:**
   Legacy git-flow required manual `git merge --continue`. gitwe uses `gitwe finish --continue` which automatically resumes the workflow state.

2. **Pushing:**
   Legacy had `-p` for push. gitwe uses `--push`. The default is `--no-push`.

3. **Verbosity:**
   Legacy `--showcommands` is replaced by `-v, --verbose`.

4. **JSON Output:**
   gitwe includes `schemaVersion: 1` in all JSON responses for better versioning.

## Manual Migration Steps

1. **Backup:** Ensure your `.git` directory is safe.
2. **Install:** `npm install -g gitwe`
3. **Initialize:** Run `gitwe init --preset classic` (or `github`/`gitlab`) to create the workflow file.
4. **Validate:** Run `gitwe config validate` to check your setup.
5. **Dry Run:** Test with `gitwe start test-branch` and `gitwe finish test-branch` to ensure hooks and merge strategies work as expected.

If you used custom branch types in AVH, copy the `[gitflow "prefix"]` section and map it to `branchTypes` entries in the gitwe YAML file.

