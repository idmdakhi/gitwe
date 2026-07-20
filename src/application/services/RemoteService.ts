import type { GitRepository } from "../../domain/ports/GitRepository";
import { RemoteConfig } from "../../domain/valueObjects/RemoteConfig";

/** Orchestrates auto-push/auto-pull behavior driven by a workflow's `RemoteConfig`. */
export class RemoteService {
  constructor(private readonly git: GitRepository) {}

  async pushIfNeeded(remote: RemoteConfig, explicitlyRequested: boolean): Promise<boolean> {
    if (!explicitlyRequested && !remote.autoPush) return false;
    await this.git.push(remote.remote);
    return true;
  }

  async pullIfConfigured(remote: RemoteConfig): Promise<boolean> {
    if (!remote.autoPull) return false;
    await this.git.pull(remote.remote);
    return true;
  }
}
