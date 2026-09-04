
# Troubleshooting

Common issues when using `gitwe` and how to resolve them.

## "Cannot initialize workflow: .gitwe/gitwe.yaml already exists"

**Error:** `Error: Workflow already initialized.`

**Solution:**
If you want to overwrite it, use the `--force` flag:

```bash
gitwe init --force
```

If you want to edit it manually, open `.gitwe/gitwe.yaml` in your editor.

---

## "Merge conflict" during `gitwe finish`

**Symptom:** `gitwe finish` stops and tells you there is a conflict.

**Solution:**

1. Resolve the conflict manually using your preferred tool (`git mergetool` or manual editing).
2. Stage the resolved files:
   ```bash
   git add .
   ```
3. Continue the operation:
   ```bash
   gitwe finish --continue
   ```

To abort the operation entirely:

```bash
gitwe finish --abort
```

---

## "Branch is not in sync with remote"

**Symptom:** `gitwe finish` fails because the local branch is behind the remote.

**Solution:**
Pull the latest changes from the remote:

```bash
git pull origin <branch-name>
```

Then retry `gitwe finish`.
If you want to force the finish anyway (use with caution), pass `--force`:

```bash
gitwe finish <type>/<name> --force
```

---

## "Operation already in progress" (state.json exists)

**Symptom:** You see a warning that an operation (like finish or update) is already in progress.

**Solution:**
Check the status:

```bash
gitwe overview
```

If you want to see what is pending, look at `.gitwe/state.json`.
To cancel the current operation:

```bash
gitwe finish --abort   # or gitwe update --abort
```

---

## "Command not found" after global install

**Symptom:** `bash: gitwe: command not found`

**Solution:**
Make sure npm's global bin directory is in your `PATH`:

```bash
# For npm default location
export PATH="$(npm bin -g):$PATH"
```

Or use `npx`:

```bash
npx gitwe <command>
```

---

## Windows path issues or "ENOENT" errors

**Symptom:** File not found errors related to `.gitwe/` on Windows.

**Solution:**
Ensure you are using a compatible shell (PowerShell 7+, Git Bash, or WSL).
gitwe uses Node.js `path` module internally, which handles Windows separators automatically. If issues persist, try running your terminal as Administrator.

---

## "Invalid workflow definition"

**Symptom:** `gitwe validate` or `gitwe init` fails with a schema error.

**Solution:**
Run the validation command to get detailed errors:

```bash
gitwe config validate
```

Check the file `.gitwe/gitwe.yaml` for typos. Refer to the [Workflow Definition Schema](./workflow-definition.md) for correct structure.
