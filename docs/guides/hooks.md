# Hooks

gitwe can run scripts before and after most operations — validate a branch
name, notify a channel, block a release, regenerate a changelog, and so on.

## Enabling hooks

```yaml
# .gitwe/gitwe.yaml
hooks:
  enabled: true
  path: .gitwe/hooks        # directory scanned for filesystem scripts
  config: .gitwe/hooks.yaml # optional: path to a separate hooks file
```

The simplest way to add a hook is to drop an executable script named after
the hook (see the list below) into `.gitwe/hooks/`:

```bash
#!/bin/bash
# .gitwe/hooks/pre-finish
if [[ "$GITWE_TYPE" == "release" && -z "$(git status --porcelain)" ]]; then
  npm test
fi
```

## Hook names

```
pre-init    post-init    pre-start    post-start
pre-finish  post-finish  pre-update   post-update
pre-publish post-publish pre-delete   post-delete
pre-tag     post-tag     pre-checkout post-checkout
pre-rename  post-rename  pre-track    post-track
```

## Where hooks can be defined

For a given hook name, gitwe collects definitions from up to four places and
runs all of them (deduplicated by script/command, first occurrence wins),
in this order:

1. **`hooks.typeOverrides.<type>.<hookName>`** — scoped to one branch type.
2. **`hooks.advanced.<hookName>`** — a full `HookDefinition` (see below).
3. **`hooks.inline.<hookName>`** — a single inline shell command.
4. **A file named `<hookName>` inside `hooks.path`** — a filesystem script.

```yaml
hooks:
  enabled: true
  path: .gitwe/hooks
  inline:
    post-start: "echo Started $GITWE_BRANCH"
  advanced:
    pre-finish:
      script: "npm test"
      when: "type == 'release'"
      continueOnError: false
  typeOverrides:
    hotfix:
      pre-finish:
        script: .gitwe/hooks/hotfix-checklist.sh
        stdin: true
```

### `HookDefinition` fields

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `script` | string | — | a shell command, or a path to an executable script |
| `when` | string | — | a condition gating this hook — see below |
| `continueOnError` | boolean | `false` | log a warning and continue instead of failing the operation |
| `parallel` | boolean | `false` | run alongside other `parallel: true` hooks for the same name instead of sequentially |
| `stdin` | boolean | `false` | pipe the hook context to the script as JSON on stdin |

Hooks with `parallel: true` for a given hook name all run concurrently first
(via `Promise.allSettled`); if any of them fails, the first failure is
thrown. Every other definition (the default) runs sequentially, in the
priority order above.

### `when` conditions

A small, sandboxed expression language over four fields — no arbitrary code
execution:

```
type == 'release'
target == 'main'
tagName =~ '^v[0-9]'
branch != 'main'
```

Supported fields: `type`, `target` (comma-joined if multiple), `tagName`,
`branch`. Operators: `==`, `!=`, and `=~` (regex match). A hook without
`when` always runs.

## Blocking an operation

A hook run with `stdin: true` can block the operation it's guarding by
printing JSON to stdout:

```json
{ "continue": false, "message": "release notes are missing" }
```

Any other stdout is ignored for this purpose. A non-zero exit code also
fails the hook (and, unless `continueOnError` is set, the whole operation);
exit code `2` is treated as a warning when `continueOnError: true`.

## Environment variables

Every hook script receives context as `GITWE_*` environment variables (in
addition to `stdin: true` scripts, which also get the same data as JSON on
stdin).

### Core

| Variable | Description |
| --- | --- |
| `GITWE_OPERATION` | hook name, e.g. `pre-start`, `post-finish` |
| `GITWE_BRANCH` | full branch name |
| `GITWE_TYPE` | branch type, e.g. `feature`, `release` |
| `GITWE_BASE` | base branch |
| `GITWE_TARGET` | target branch(es), comma-separated |
| `GITWE_DRY_RUN` | `"true"` if dry-run mode is enabled |
| `GITWE_FORCE` | `"true"` if `--force` was used |
| `GITWE_REMOTE` | remote name relevant to this operation |
| `GITWE_CONFIG` | path to the workflow definition, when available |

### Operation-specific

| Variable | Description | Present in |
| --- | --- | --- |
| `GITWE_TAG_NAME` | tag name | `pre-tag`, `post-tag` |
| `GITWE_OLD_NAME` | old branch name | `pre-rename`, `post-rename` |
| `GITWE_NEW_NAME` | new branch name | `pre-rename`, `post-rename` |
| `GITWE_BRANCH_DELETED` | `"true"` if the branch was deleted | `post-delete` |
| `GITWE_MERGED_INTO` | comma-separated list of merged targets | `post-finish` |

### Extra fields

Any other key passed via a use case's `extra` context is exposed too:
camelCase keys become `SNAKE_CASE`, prefixed with `GITWE_`. For example,
`{ squash: true, push: false }` becomes:

```
GITWE_SQUASH=true
GITWE_PUSH=false
```

### Using them

```bash
#!/bin/bash
echo "Branch: $GITWE_BRANCH"
echo "Type: $GITWE_TYPE"
```

```js
#!/usr/bin/env node
const { GITWE_BRANCH, GITWE_TYPE } = process.env;
console.log(`Branch: ${GITWE_BRANCH}, Type: ${GITWE_TYPE}`);
```

```bash
#!/bin/bash
# stdin: true — read the same context as JSON instead
context=$(cat)
type=$(echo "$context" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).type")
```
