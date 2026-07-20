import { DomainError } from "#gitwe/domain/errors/index";

export class GitCommandError extends DomainError {
  readonly code = "GIT_COMMAND_FAILED";

  constructor(
    message: string,
    public readonly command: string,
    public readonly stderr: string,
  ) {
    super(message);
  }
}
