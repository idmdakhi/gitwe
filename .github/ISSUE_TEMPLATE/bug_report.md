---
name: Bug report
about: Report something that isn't working as expected
title: "[Bug] "
labels: bug
assignees: ""
---

## Describe the bug

A clear, concise description of what's wrong.

## To reproduce

Steps to reproduce the behavior, ideally with the exact `gitwe` command(s) you ran:

```bash
gitwe start feature login
gitwe finish feature/login
```

## Expected behavior

What you expected to happen instead.

## Actual behavior

What actually happened — include the full error output if there is one.

## Environment

- `gitwe` version: <!-- run `gitwe --version` -->
- Node.js version: <!-- run `node --version` -->
- OS: <!-- e.g. Windows 11, macOS 14, Ubuntu 24.04 -->
- Active workflow: <!-- built-in (git-flow / github-flow / trunk-based) or a custom `--config` file -->

## Workflow config (if using a custom one)

```yaml
# paste the relevant part of your workflow config here
```

## Additional context

Anything else that might help — logs (run with `GITWE_DEBUG=1` for verbose git command logging), screenshots, etc.
