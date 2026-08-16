# Interactive `gitwe init`

## What was added

| File                                                  | Role                                                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/cli/prompts.ts`                                  | `ask` / `confirm` / `choose` / `parseKeyValue` via Node `readline` (no new deps)                                     |
| `src/cli/commands/init-wizard.ts`                     | Interactive flow: preset → name → bases → prefixes → merge → remote → versioning → hooks → create branches → confirm |
| `src/cli/commands/init.command.ts`                    | Full command: interactive **or** `--defaults` + flag overrides                                                       |
| `src/application/use-cases/init-workflow.use-case.ts` | Accepts `config` **or** `preset`, plus `createBranches`                                                              |
| `engine.init-snippet.ts`                              | Signature change for `Engine.init(deps, options)`                                                                    |

## Behaviour

| Mode            | When                                               | Behaviour                                                            |
| --------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| **Interactive** | TTY and **no** `--defaults` and format is text     | Wizard customises a preset into `gitwe.yaml`                         |
| **Defaults**    | `--defaults`, or non-TTY, or `--format json\|yaml` | Write preset as-is (+ optional `--branch` / `--prefix` / `--remote`) |

## Flags

```text
gitwe init
gitwe init --defaults
gitwe init -p github --defaults
gitwe init -p classic --branch main=trunk --prefix feature=feat/
gitwe init --remote upstream --no-create-branches --force
gitwe init --defaults --format json
```

## Apply to the repo

1. Copy `prompts.ts` → `src/cli/prompts.ts`
2. Copy `init-wizard.ts` → `src/cli/commands/init-wizard.ts`
3. Replace `src/cli/commands/init.command.ts`
4. Replace `src/application/use-cases/init-workflow.use-case.ts`
5. In `src/application/engine.ts`, change `init` to:

```ts
static async init(
  deps: EngineDeps,
  options: {
    preset?: "classic" | "github" | "gitlab";
    config?: WorkflowConfig;
    force?: boolean;
    createBranches?: boolean;
  },
): Promise<Engine> {
  const useCase = new InitWorkflowUseCase(deps.configRepo, deps.git);
  const config = await useCase.execute({
    preset: options.preset,
    config: options.config,
    force: options.force,
    createBranches: options.createBranches,
  });
  return new Engine(new WorkflowService(config), { logger: silentLogger, ...deps });
}
```

6. Update any other call sites of `Engine.init(deps, "classic", true)` to  
   `Engine.init(deps, { preset: "classic", force: true })`.

7. E2E: use `init --defaults --preset classic` (interactive is not for CI).

## Wizard steps (TTY)

1. Choose preset (classic / github / gitlab)
2. Workflow name
3. Optional: rename base branches (rewires `base` / `target` references)
4. Optional: change type prefixes
5. Optional: default merge strategy
6. Remote name
7. Versioning on/off + tag prefix
8. Hooks on/off
9. Create missing base branches?
10. Summary + confirm

Validation still runs through `ConfigValidatorService` before save.

## Notes

- No new npm dependency.
- `--format json|yaml` forces non-interactive so CI stays deterministic.
- Cancel at the final confirm exits with code 1 and writes nothing.
- Deep “edit every target array” is intentionally out of scope; advanced users edit the YAML after init.
