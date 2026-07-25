import { DomainError } from "#gitwe/domain/errors";

export class GitCommandError extends DomainError {
  readonly code = "GIT_COMMAND_FAILED";

  constructor(
    message: string,
    public readonly command: string,
    public readonly stderr: string,
    /**
     * Git often writes the actually-useful diagnostic — e.g. "CONFLICT
     * (content): Merge conflict in ..." from a failed `merge` or `rebase`
     * — to stdout, not stderr. Callers that pattern-match on conflict
     * output (see `cli/commands/finish.ts`, `cli/commands/update.ts`) need
     * to check both.
     */
    public readonly stdout: string = "",
  ) {
    super(message);
  }
}
