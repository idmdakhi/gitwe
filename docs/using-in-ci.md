# Using gitwe in CI

This page shows copy-pasteable snippets for running gitwe inside GitHub Actions and GitLab CI, using
the commands that are actually implemented today — see [commands.md](./commands.md) for the full,
up-to-date reference and a note on commands that are planned but not yet wired in (`doctor`,
`--format json|yaml|table`, etc.).

gitwe is designed to be CI-friendly:

- Exit code `0` = success
- Exit code `1` = error
- Exit code `2` = merge/rebase conflict (resume with `finish --continue` or cancel with `finish --abort`)
- Machine-readable output (`--format json` / `--format yaml`, `schemaVersion: 1`) is designed and
  scaffolded (see [RFC-0004](./development/rfcs/0004-machine-readable-output.md)) but **not yet
  wired into any command** — see [ROADMAP.md](./development/ROADMAP.md). Until then, parse
  human-readable text output, or call `Engine` directly from a small Node script (see
  ["Library usage"](../README.md#library-usage)).

---

## GitHub Actions

### 1. Use the official Action

> The root [`action.yaml`](../action.yaml) predates the 1.0 rewrite and its `doctor`/`graph`/
> `--format` support does not currently match the CLI — see the compatibility notice at the top of
> [github-action.md](./github-action.md). The snippet below only uses commands that exist in both.

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
        uses: idmdakhi/gitwe@v1
        with:
          command: start
          type: feature
          short-name: ${{ github.head_ref }}

      - name: Show status
        uses: idmdakhi/gitwe@v1
        with:
          command: status
```

### 2. Finish on merge to main

```yaml
- name: Finish feature
  if: github.event.pull_request.merged == true
  uses: idmdakhi/gitwe@v1
  with:
    command: finish
    branch-name: feature/${{ github.head_ref }}
    push: true
```

### 3. Validate config + dry-run

```yaml
- name: Validate workflow
  uses: idmdakhi/gitwe@v1
  with:
    command: validate
    config: .gitwe/gitwe.yaml

- name: Finish dry-run
  uses: idmdakhi/gitwe@v1
  with:
    command: finish
    branch-name: feature/login
    dry-run: true
```

### 4. Local install (recommended until the Action is re-aligned)

Installing gitwe directly and calling the CLI gives you exactly the nine
commands documented in [commands.md](./commands.md), with no dependency on the
root Action's compatibility gap:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0

- uses: actions/setup-node@v4
  with:
    node-version: "22"
    cache: npm

- run: npm install -g gitwe # or: npm ci && npm run build

- run: gitwe validate
- run: gitwe overview
- run: gitwe start feature ci-demo
- run: gitwe finish feature/ci-demo --push
```

---

## GitLab CI

```yaml
stages:
  - workflow

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
```

### Finish on protected branch (example)

```yaml
finish:
  stage: workflow
  image: node:22
  script:
    - npm install -g gitwe
    - gitwe finish "$CI_COMMIT_REF_NAME" --push
  only:
    - main
```

---

## Tips

| Tip          | Detail                                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| Full history | Always use `fetch-depth: 0` (GitHub) or `GIT_DEPTH: 0` (GitLab) so merge-base and ahead/behind work.          |
| Identity     | Set `user.name` / `user.email` (and disable GPG signing if needed).                                           |
| Conflicts    | Exit code `2` means a conflict; resume with `gitwe finish --continue` or cancel with `gitwe finish --abort`.  |
| Config       | Pass `--config path/to/gitwe.yaml`; there is no `GITWE_CONFIG` environment variable yet ([TODO.md](./development/TODO.md)). |
| Machine-readable output | Not available yet on the current CLI — parse text output or use `Engine` as a library instead of `--format json`. |

---

## Related

- [Command reference](./commands.md)
- [GitHub Action details (see compatibility notice)](./github-action.md)
- [Workflow definition](./workflow-definition.md)
- [RFC-0003 Doctor](./development/rfcs/0003-doctor-auto-repair.md)
- [RFC-0004 Machine-readable output](./development/rfcs/0004-machine-readable-output.md)
