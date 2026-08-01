import { execFile } from "node:child_process";
import { GitCommandError } from "#gitwe/infrastructure/git/git-command-error";

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Runs `git` with `args` in `cwd` and resolves with its captured
 * stdout/stderr/exit code, *regardless* of exit code. Uses `execFile`
 * (never a shell), so arguments — including branch names containing
 * shell-meaningful characters — cannot trigger command injection.
 *
 * Prefer {@link execGit} unless the caller specifically needs to inspect
 * a non-zero exit without throwing.
 *
 * @internal
 */
export function execGitRaw(args: readonly string[], cwd: string): Promise<ExecResult> {
  return new Promise((resolve) => {
    execFile(
      "git",
      args as string[],
      { cwd, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const exitCode = error && "code" in error && typeof error.code === "number" ? error.code : 0;
        resolve({ stdout, stderr, exitCode });
      },
    );
  });
}

/**
 * Runs `git` with `args` in `cwd` and returns stdout/stderr.
 *
 * @internal
 * @throws {GitCommandError} If the process exits with a non-zero status.
 */
export async function execGit(
  args: readonly string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string }> {
  const result = await execGitRaw(args, cwd);
  if (result.exitCode !== 0) {
    throw new GitCommandError(args, result.exitCode, result.stderr);
  }
  return { stdout: result.stdout, stderr: result.stderr };
}
