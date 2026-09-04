# Installation

Choose the method that best fits your environment.

## Global Installation (npm)

Install `gitwe` globally to use it as a command-line tool:

```bash
npm install -g gitwe
```

Verify the installation:

```bash
gitwe --version
```

## Using npx (No Installation)

Run `gitwe` without installing it globally:

```bash
npx gitwe --help
```

This is useful for CI pipelines or one-off usage.

## Using the GitHub Action

For CI/CD pipelines (GitHub Actions), you can use the official action:

```yaml
- name: Run gitwe
  uses: idmdakhi/gitwe@v1
  with:
    args: 'finish feature/login --push'
```

See the [CI Guide](../user-guide/ci.md) for more details.

## Building from Source

If you want to contribute or test the latest development version:

```bash
git clone https://github.com/idmdakhi/gitwe.git
cd gitwe
npm install
npm run build
# Link globally
npm link
```

## Requirements

- **Node.js:** 20.x or higher
- **Git:** 2.30 or higher
- **Operating System:** Linux, macOS, or Windows (via WSL, Git Bash, or PowerShell 7+)

## Upgrading

To upgrade to the latest version:

```bash
npm update -g gitwe
```

Check the [CHANGELOG](https://github.com/idmdakhi/gitwe/blob/develop/CHANGELOG.md) for breaking changes before upgrading.
