# Unified CLI (post-duality)

## Design rules

1. **One entry tree** — only `program.ts` registers commands.
2. **One factory style** — every command is `export function xxxCommand(): Command`.
3. **One wiring path** — `loadEngine` + `action` from `commands/shared.ts`.
4. **Engine-only application API** — no `createEngine` / `context.js` / missing modules.
5. **`--format text|json|yaml`** on the root program; commands read it via `globalOptions(this)`.

## Commands registered

| Command                             | Engine API                                  |
| ----------------------------------- | ------------------------------------------- |
| `init`                              | `Engine.init`                               |
| `start`                             | `engine.start`                              |
| `finish` / `--continue` / `--abort` | `finish` / `continueFinish` / `abortFinish` |
| `update`                            | `engine.update`                             |
| `publish`                           | `engine.publish`                            |
| `delete`                            | `engine.delete`                             |
| `list`                              | `engine.list`                               |
| `overview` (`status`)               | `engine.overview`                           |
| `validate`                          | `engine.validate`                           |
| `version`                           | `src/version.ts`                            |
| `types`                             | `engine.workflow.branchTypes`               |
| `current`                           | `overview` + `workflow.resolveBranch`       |
| `doctor`                            | report-only from `validate` + `overview`    |

## Intentionally deferred (need Engine / use-case work)

`graph`, `track`, `rename`, `checkout`, `config edit`, `tag`, `sync`, `rebase`, `modules`, full `doctor --fix` — reintroduce as `*.command.ts` only after the corresponding Engine method exists.

## Apply

```bash
# from repo root
cp -r path/to/cleaned/cli/commands/*.command.ts src/cli/commands/
cp path/to/cleaned/cli/commands/shared.ts src/cli/commands/shared.ts
cp path/to/cleaned/cli/program.ts src/cli/program.ts
cp path/to/cleaned/cli/output.ts src/cli/output.ts

# delete duals listed in DELETE_CLI.txt
xargs rm -f < path/to/cleaned/cli/DELETE_CLI.txt

npm run typecheck && npm test && npm run build
```

Fix `init.command.ts` import of `shared`: it lives next to other commands, so
`from "./shared.js"` is correct (init no longer imports from a non-command path for action).
