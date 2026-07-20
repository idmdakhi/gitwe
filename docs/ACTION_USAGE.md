# Using `gitwe` as a GitHub Action

`action.yml` at the repo root turns `gitwe` into a reusable composite Action
that other repositories can call in their own workflows — the workflow
engine, not just the CLI, becomes something other projects can depend on.

## Prerequisites

- The **consuming repo must check itself out first** (`actions/checkout`) —
  `gitwe` operates on `GITHUB_WORKSPACE` (or `working-directory`), not on
  the `gitwe` repo itself.
- No local Node/npm setup needed in the caller's workflow — the action
  installs and builds `gitwe` itself, in its own isolated checkout
  (`github.action_path`).

## Basic usage

```yaml
steps:
  - uses: actions/checkout@v4

  - name: Start a feature branch
    uses: your-org/gitwe@v2
    id: gitwe
    with:
      command: start
      type: feature
      short-name: login

  - run: echo "Created ${{ steps.gitwe.outputs.branch-name }}"
```

Pin `@v2` to a tag, branch, or commit SHA of the `gitwe` repo, same as any
other Action.

## Inputs

| Input               | Required     | Default    | Used by           | Description                                                                                      |
| ------------------- | ------------ | ---------- | ----------------- | ------------------------------------------------------------------------------------------------ |
| `command`           | yes          | —          | all               | `start`, `finish`, `status`, `graph`, `current`, `list`, `types`, `validate`, `doctor`, `config` |
| `type`              | for `start`  | —          | `start`           | Branch type, e.g. `feature`, `release`, `hotfix`                                                 |
| `short-name`        | for `start`  | —          | `start`           | Short branch name, e.g. `login`                                                                  |
| `branch-name`       | for `finish` | —          | `finish`          | Full branch name, e.g. `feature/login`                                                           |
| `workflow`          | no           | `git-flow` | most              | Built-in workflow: `git-flow` \| `github-flow` \| `trunk-based`. Ignored if `config` is set.     |
| `config`            | no           | —          | most, `validate`  | Path (relative to `working-directory`) to a custom JSON/YAML workflow config                     |
| `delete-branch`     | no           | `true`     | `finish`          | Delete the branch after merging                                                                  |
| `push`              | no           | `false`    | `finish`          | Push to the remote after finishing                                                               |
| `abort-on-conflict` | no           | `false`    | `finish`          | Run `git merge --abort` automatically on conflict, instead of failing the step                   |
| `root`              | no           | `main`     | `status`, `graph` | Root branch to summarize/draw from                                                               |
| `working-directory` | no           | `.`        | all               | Directory of the already-checked-out repo to operate on                                          |

## Outputs

| Output        | Populated by      | Description                                                                                                                        |
| ------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `branch-name` | `start`, `finish` | The branch created or finished                                                                                                     |
| `merged-into` | `finish`          | Comma-separated list of branches merged into                                                                                       |
| `tags`        | `finish`          | Comma-separated list of tags created                                                                                               |
| `result-json` | all               | The full raw JSON result — parse this yourself for anything not covered above (e.g. `status`'s branch tree, `doctor`'s check list) |

If the command fails, the step fails (non-zero exit) and `result-json`
contains `{"error":true,"code":"...","message":"..."}` — useful if you want
to inspect the failure in a later step with `if: failure()`.

## Examples

### Start a branch

```yaml
- uses: your-org/gitwe@v2
  id: start
  with:
    command: start
    type: feature
    short-name: ${{ github.event.inputs.feature_name }}

- run: git push origin ${{ steps.start.outputs.branch-name }}
```

### Finish a branch, push, and use the resulting tag

```yaml
- uses: your-org/gitwe@v2
  id: finish
  with:
    command: finish
    branch-name: release/1.4.0
    push: "true"

- name: Create a GitHub release from the tag
  if: steps.finish.outputs.tags != ''
  run: gh release create ${{ steps.finish.outputs.tags }} --generate-notes
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Finish with automatic conflict recovery in CI

```yaml
- uses: your-org/gitwe@v2
  with:
    command: finish
    branch-name: feature/login
    abort-on-conflict: "true"
```

### Validate a workflow config on every PR that touches it

```yaml
on:
  pull_request:
    paths: ["gitwe.json"]

steps:
  - uses: actions/checkout@v4
  - uses: your-org/gitwe@v2
    with:
      command: validate
      config: gitwe.json
```

### Use a custom workflow config instead of a built-in one

```yaml
- uses: your-org/gitwe@v2
  with:
    command: start
    type: feature
    short-name: login
    config: .gitwe/team-workflow.yaml
```

### Health-check the repo before running other automation

```yaml
- uses: your-org/gitwe@v2
  id: doctor
  with:
    command: doctor

- name: Fail fast on an unhealthy repo
  if: fromJson(steps.doctor.outputs.result-json).healthy == false
  run: exit 1
```

### Operating on a repo checked out somewhere other than the default path

```yaml
- uses: actions/checkout@v4
  with:
    path: my-service

- uses: your-org/gitwe@v2
  with:
    command: status
    working-directory: my-service
```

## Notes

- The action always runs `gitwe` with `--json` internally, so human-readable
  console noise doesn't leak into `result-json` — you'll see the raw JSON
  echoed in the step log too, for debugging.
- `validate` doesn't touch the checked-out repo at all — it only parses and
  checks the config file's invariants (unique branch-type names/prefixes,
  at least one merge target, etc.), so it's safe to run before checkout
  order matters or on repos that aren't even git-flow-shaped yet.
- Every run installs and builds `gitwe` from source inside
  `github.action_path` (`npm ci && npm run build`), so there's a small,
  constant startup cost per job — there's no published npm package this
  pulls from yet. If that overhead matters, GitHub's Action cache
  (`actions/cache` keyed on `package-lock.json`) can be added to the
  "Install and build gitwe" step in `action.yml`.
