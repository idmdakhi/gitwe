# Environment Variables for Hooks

When gitwe runs a hook script, it exposes the following environment variables with context about the current operation.

## Core variables

| Variable          | Description                                  | Available in |
| ----------------- | -------------------------------------------- | ------------ |
| `GITWE_OPERATION` | Hook name (e.g., `pre-start`, `post-finish`) | All hooks    |
| `GITWE_BRANCH`    | Full branch name                             | All hooks    |
| `GITWE_TYPE`      | Branch type (e.g., `feature`, `release`)     | All hooks    |
| `GITWE_BASE`      | Base branch                                  | All hooks    |
| `GITWE_TARGET`    | Target branch(es), comma-separated           | All hooks    |
| `GITWE_DRY_RUN`   | `"true"` if dry-run mode is enabled          | All hooks    |
| `GITWE_FORCE`     | `"true"` if `--force` was used               | All hooks    |
| `GITWE_REMOTE`    | Default remote name                          | All hooks    |

## Operation-specific variables

| Variable               | Description                            | Available in                |
| ---------------------- | -------------------------------------- | --------------------------- |
| `GITWE_TAG_NAME`       | Tag name                               | `pre-tag`, `post-tag`       |
| `GITWE_OLD_NAME`       | Old branch name                        | `pre-rename`, `post-rename` |
| `GITWE_NEW_NAME`       | New branch name                        | `pre-rename`, `post-rename` |
| `GITWE_BRANCH_DELETED` | `"true"` if branch was deleted         | `post-delete`               |
| `GITWE_MERGED_INTO`    | Comma-separated list of merged targets | `post-finish`               |

## Extra variables

Any additional data passed via `context.extra` is automatically converted to an environment variable with the prefix `GITWE_`. CamelCase keys are converted to snake_case and uppercased.

Example:

```typescript
context.extra = { squash: true, push: false };
```

Results in:

```
GITWE_SQUASH="true"

GITWE_PUSH="false"
```

Using environment variables in hooks

```Bash
#!/bin/bash
echo "Branch: $GITWE_BRANCH"
echo "Type: $GITWE_TYPE"
```

```js
#!/usr/bin/env node
const branch = process.env.GITWE_BRANCH;
const type = process.env.GITWE_TYPE;
console.log(`Branch: ${branch}, Type: ${type}`);
```
