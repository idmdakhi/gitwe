# Gitwe Examples

This directory contains ready-to-use workflow configuration files for `gitwe`. You can use them as-is or customize them for your own projects.

## Quick Start

```bash
# Use a built-in workflow (git-flow, github-flow, trunk-based)
gitwe --workflow git-flow start feature login

# Use a custom config file
gitwe --config examples/git-flow.yaml start feature login

# Validate a config file
gitwe validate examples/custom-workflow.yaml
```
