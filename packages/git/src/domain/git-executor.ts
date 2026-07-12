import type { GitClient } from "./git-client";
import type { GitCommand } from "./git-command";

export interface GitExecutor<T extends GitCommand> {
  execute(
    command: T,

    client: GitClient,
  ): Promise<void>;
}
