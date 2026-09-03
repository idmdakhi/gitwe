# Using gitwe in CI

gitwe is designed to be CI-friendly:

- Exit code `0` = success, `1` = error, `2` = merge/rebase conflict (resume
  with `gitwe finish --continue`, or cancel with `gitwe finish --abort`).
- `--format json` / `--format yaml` wrap every command's result in a stable,
  versioned envelope (`schemaVersion: 1`) — see
  [global options](./commands.md#global-options).

Always fetch full history (`fetch-depth: 0` on GitHub, `GIT_DEPTH: 0` on
GitLab) so merge-base and ahead/behind checks have the refs they need, and
set a git identity (`user.name`/`user.email`) before any command that
commits, merges, or tags.

## Installing gitwe directly (recommended)

The most reliable way to use gitwe in CI is to install it and call the CLI —
no dependency on a wrapper action's flag mapping staying in sync.

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0

- uses: actions/setup-node@v4
  with:
    node-version: "22"
    cache: npm

- run: npm install -g gitwe

- run: gitwe validate
- run: gitwe doctor
- run: gitwe overview --format json
- run: gitwe start feature ci-demo
- run: gitwe finish feature/ci-demo --push
```

GitLab CI equivalent:

```yaml
stages: [workflow]

gitwe:
  stage: workflow
  image: node:22
  variables:
    GIT_DEPTH: 0
  before_script:
    - npm install -g gitwe
    - git config --global user.email "ci@example.com"
    - git config --global user.name "CI"
  script:
    - gitwe validate
    - gitwe overview
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

finish:
  stage: workflow
  image: node:22
  script:
    - npm install -g gitwe
    - gitwe finish "$CI_COMMIT_REF_NAME" --push
  only:
    - main
```

## The official GitHub Action

The repository root ships `action.yaml`, referenced as:

| Reference | When to use |
| --- | --- |
| `uses: idmdakhi/gitwe@v1` | from another repository, pinned to a release |
| `uses: idmdakhi/gitwe@main` | from another repo, always latest `main` (not recommended for production) |
| `uses: ./` | inside this repository (self-test / dogfooding) |

> ⚠️ **Compatibility notice.** `action.yaml` predates several CLI changes and
> still passes flags the current binary doesn't accept: a global `--json`
> instead of `--format json`, `--workflow <preset>` instead of
> `init --preset`, and `--abort-on-conflict`/`--strategy` on `finish`, which
> don't exist as flags there (use `--rebase`/`--squash` and `finish --abort`
> instead). Re-aligning it with the current CLI is tracked in the
> [roadmap](../development/roadmap.md). Until it's fixed, prefer installing
> gitwe directly as shown above; if you need the Action's checkout/build
> caching without its flag translation, call `gitwe` yourself in a
> `run:` step after `uses: idmdakhi/gitwe@v1`'s setup, or use
> `.github/actions/setup` (Node + deps only, no flag translation) alongside
> plain `gitwe` calls.

### Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `command` | yes | — | `start`, `finish`, `status`, `graph`, `current`, `list`, `validate`, `doctor`, ... |
| `type` | for `start` | — | branch type (`feature`, `release`, `hotfix`, ...) |
| `short-name` | for `start` | — | short name (e.g. `login`) |
| `branch-name` | for `finish` | — | full branch name (e.g. `feature/login`) |
| `workflow` | no | `classic` | built-in preset: `classic` \| `github` \| `gitlab` |
| `config` | no | — | path to a custom workflow file (overrides `workflow`) |
| `delete-branch` | no | `true` | delete the topic branch after `finish` |
| `push` | no | `false` | push updated branches/tags after `finish` |
| `abort-on-conflict` | no | `false` | abort merge on conflict |
| `root` | no | `main` | root branch for `status`/`graph` |
| `working-directory` | no | `.` | directory of the git repository |
| `dry-run` | no | `false` | only print what would happen |
| `strategy` | no | `merge` | `merge` \| `squash` \| `rebase` |
| `node-version` | no | `22` | Node.js version used to run gitwe |

### Outputs

| Output | Description |
| --- | --- |
| `branch-name` | created or finished branch |
| `merged-into` | comma-separated list of branches that received the merge |
| `tags` | comma-separated list of tags created |
| `result-json` | full JSON result of the command |

### Example

```yaml
name: Feature workflow

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  gitwe:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Start feature branch
        id: start
        uses: idmdakhi/gitwe@v1
        with:
          command: start
          type: feature
          short-name: ${{ github.head_ref }}

      - run: echo "Created ${{ steps.start.outputs.branch-name }}"

  finish:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: idmdakhi/gitwe@v1
        with:
          command: finish
          branch-name: feature/${{ github.head_ref }}
          push: true
```

## This repository's own CI

`.github/workflows/gitwe.yaml` dogfoods the Action (`uses: ./`) against
gitwe's own `.gitwe/gitwe.yaml`: it validates the definition, runs `doctor`,
prints `status` and `graph --root main`, and — on pull requests only — runs a
`start`/`finish --dry-run` demo with `continue-on-error: true` so a failure
never blocks the rest of CI. `.github/actions/setup` is a separate,
lighter-weight composite action (Node + deps only) used by the repo's own
`test`/`lint`/`typecheck` jobs; it does not run gitwe commands, so don't use
it in place of `action.yaml` if what you need is to execute gitwe.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `NotInitializedError` | no workflow config in the repo | run `gitwe init`, or pass `--config`/`config:` |
| Slow Action run | cold cache | second run is faster; cache key is the Action's `package-lock.json` |
| Permission denied on push | missing `contents: write` | add `permissions: contents: write` to the job |
| Wrong branch created | `short-name` contains `/` | use a simple short name; the prefix comes from the workflow definition |
| Exit code `2` | a merge/rebase conflict | resolve it, then `gitwe finish --continue` or `gitwe finish --abort` |
| Action rejects a flag it used to accept | `action.yaml` vs. current CLI mismatch, see the notice above | install gitwe directly instead of going through the Action |
