import { GitRepository } from "#gitwe/git/GitRepository";
import { SimpleGitAdapter } from "#gitwe/git/SimpleGit";

export class GitFactory {
  static create() {
    return new GitRepository(new SimpleGitAdapter());
  }
}
