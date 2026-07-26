import { HookPhase } from "#gitwe/domain/hooks/HookPhase";

/**
 * Port for executing hook commands. Kept separate from `GitRepository`
 * because running arbitrary shell commands is a distinct capability with
 * its own failure mode (`HookExecutionError`), not a git operation.
 */
export interface HookRunner {
  run(phase: HookPhase, commands: readonly string[]): Promise<void>;
}
