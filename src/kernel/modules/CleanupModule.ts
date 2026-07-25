import type { KernelModule } from "../KernelModule";
import type { CleanupHandler, CleanupResult } from "#gitwe/application/handlers/CleanupHandler";

export interface CleanupInput {
  readonly dryRun?: boolean;
}

export class CleanupModule implements KernelModule<CleanupInput, CleanupResult> {
  readonly name = "cleanup";
  readonly description = "Delete branches that have already been merged into all their targets.";

  constructor(private readonly handler: CleanupHandler) {}

  execute(input: CleanupInput = {}): Promise<CleanupResult> {
    return this.handler.handle(input);
  }
}
