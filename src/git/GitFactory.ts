import { GitRepository } from "./GitRepository";
import { SimpleGitAdapter } from "./SimpleGit";

export class GitFactory {
  static create() {
    return new GitRepository(new SimpleGitAdapter());
  }
}
