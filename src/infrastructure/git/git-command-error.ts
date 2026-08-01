import { DomainError } from "#gitwe/domain/errors/index";

/**
 * Thrown by {@link ShellGitRepository} when the underlying `git` process
 * exits with a non-zero status.
 *
 * @public
 */
export class GitCommandError extends DomainError {
  readonly code = "GIT_COMMAND_FAILED";

  /**
   * @param args - The git arguments that were run (excluding the `git` binary itself).
   * @param exitCode - The process exit code.
   * @param stderr - Captured stderr output, included in the error message for quick diagnosis.
   */
  constructor(
    public readonly args: readonly string[],
    public readonly exitCode: number,
    public readonly stderr: string,
  ) {
    super(`git ${args.join(" ")} failed (exit ${exitCode}): ${stderr.trim() || "(no stderr output)"}`);
  }
}
