## Summary

What does this PR change, and why?

## Which layer(s) does this touch?

- [ ] `domain`
- [ ] `application`
- [ ] `infrastructure`
- [ ] `cli`
- [ ] tests only
- [ ] docs / config only

See [architecture overview](../docs/architecture/overview.md) if you're
unsure which layer something belongs in.

## Checklist

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] I added/updated tests for the change (see
      [testing.md](../docs/development/testing.md))
- [ ] No new class/interface duplicates an existing name (`domain` in
      particular has exactly one of everything — please keep it that way)
- [ ] `domain` and `application` still don't import anything from
      `infrastructure` or `cli`
- [ ] Docs updated if this changes a command, flag, or the workflow schema
      (`docs/guides/commands.md`, `docs/guides/workflow-definition.md`)

## Related issues

Closes #
