# Hooks

Hooks are executable scripts (or commands) that run at specific points during a gitwe operation. They allow you to integrate with external tools, run validations, or send notifications.

## How to Define Hooks

Hooks can be defined globally in the workflow root, or specifically for a branch type.

**Global hook (in `.gitwe/gitwe.yaml`):**

```yaml
hooks:
  pre-start: ./scripts/pre-start.sh
  post-finish: ./scripts/notify.sh
```

**Branch-specific hook:**

```yaml
branchTypes:
  - name: release
    hooks:
      pre-finish: ./scripts/validate-changelog.sh
```

## Available Hook Points

| Hook Name | When it runs | Exit code behavior |
| :--- | :--- | :--- |
| `pre-start` | Before creating the new branch. | Non-zero → aborts the operation. |
| `post-start` | After the branch is created and checked out. | Non-zero → prints warning, but continues. |
| `pre-finish` | Before merging/rebase begins. | Non-zero → aborts the operation. |
| `post-finish` | After the branch is merged, tagged, and (optionally) pushed. | Non-zero → prints warning, but continues. |
| `pre-publish` | Before `git push` in `publish` command. | Non-zero → aborts the operation. |
| `post-publish` | After `git push` succeeds. | Non-zero → prints warning, but continues. |
| `pre-delete` | Before deleting the branch. | Non-zero → aborts the operation. |

## Environment Variables Available to Hooks

All hooks receive the following environment variables:

| Variable | Description |
| :--- | :--- |
| `GITWE_BRANCH_TYPE` | The type of the branch (e.g., `feature`, `release`). |
| `GITWE_BRANCH_NAME` | The full name of the branch (without prefix). |
| `GITWE_BASE_BRANCH` | The base branch this topic derives from. |
| `GITWE_TARGET_BRANCH` | The target branch for merge. |
| `GITWE_WORKFLOW_PATH` | Absolute path to the `.gitwe/gitwe.yaml` file. |
| `GITWE_OPERATION_ID` | A unique ID for the current operation (for logging). |
| `GITWE_VERBOSE` | `"true"` if `--verbose` is used, otherwise `"false"`. |

## Example: Pre-Finish Validation Hook

Create `scripts/validate-ci.sh`:

```bash
#!/bin/bash
echo "Checking if CI passed for $GITWE_BRANCH_NAME..."
# Custom logic to call GitHub API or Jenkins
# Exit with non-zero to abort the finish
```

Make it executable:

```bash
chmod +x scripts/validate-ci.sh
```

Reference it in the workflow:

```yaml
branchTypes:
  - name: feature
    hooks:
      pre-finish: ./scripts/validate-ci.sh
```

## Notes

- Hooks are executed with the working directory set to the repository root.
- They must be executable files (on Linux/macOS) or `.bat`/`.ps1` files on Windows.
- If a hook is not found, gitwe prints a warning but does not abort (unless it's a `pre-*` hook that is configured but missing, in which case it fails explicitly).
