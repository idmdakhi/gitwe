const CONVENTIONAL_COMMIT_PATTERN =
  /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([\w./-]+\))?!?: .{1,100}$/;

/**
 * Validates a commit message against the Conventional Commits spec
 * (https://www.conventionalcommits.org). Used by `gitwe commit-lint` and
 * the `doctor` command when a workflow enables `commit.conventional`.
 */
export class ConventionalCommitPolicy {
  private constructor(public readonly enabled: boolean) {}

  static create(props: { enabled?: boolean } = {}): ConventionalCommitPolicy {
    return new ConventionalCommitPolicy(props.enabled ?? false);
  }

  /** Returns a violation reason, or `undefined` if `message` is valid (or this policy is disabled). */
  validate(message: string): string | undefined {
    if (!this.enabled) return undefined;
    const firstLine = message.split("\n")[0] ?? "";
    if (!CONVENTIONAL_COMMIT_PATTERN.test(firstLine)) {
      return (
        'must follow Conventional Commits: "<type>(<scope>): <description>", ' +
        "e.g. \"feat(auth): add password reset\" — type must be one of " +
        "build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test"
      );
    }
    return undefined;
  }
}
