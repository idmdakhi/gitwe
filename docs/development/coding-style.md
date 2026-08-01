# Coding style

## TypeScript

- **ESM only** (`"type": "module"`). Import paths end with `.js` even for `.ts` sources.
- **Strict mode** is on. Prefer explicit types on public APIs; let inference work inside functions.
- Prefer `interface` for object shapes that may be extended; `type` for unions and mapped types.
- No default exports in library code — named exports keep refactors safer.

## Layers

- Put pure validation and branch-tree rules in **domain**.
- Put orchestration that talks to ports in **application**.
- Put `fs` / `child_process` / path I/O in **infrastructure**.
- Put argv parsing and coloured output in **cli**.

Never import outward:

```
domain  ↛  application | infrastructure | cli | di
application  ↛  infrastructure | cli | di
```

## Naming

- One concept → one name. Do not add a second class that means the same as an existing domain type.
- Infrastructure adapters that use the filesystem are prefixed with `File` (`FileHookRunner`, `FileOperationStateStore`).
- Use cases that implement a multi-step operation live under `application/use-case/`.

## Errors

Throw subclasses of `GitweError` with a stable `code` and an optional `hint` for the user.
The CLI maps them in `error-reporter.ts`; do not `console.log` errors from domain/application.

## Formatting

- Prettier config is in `.prettierrc.json` (double quotes, trailing commas, width 100).
- Run `npm run format` before opening a PR; CI runs `format:check`.
