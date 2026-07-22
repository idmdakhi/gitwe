import type { HookRunner } from "#gitwe/domain/ports/HookRunner";
import { HookDefinition } from "#gitwe/domain/hooks/HookDefinition";
import { HookPhase } from "#gitwe/domain/hooks/HookPhase";

/** Thin orchestration wrapper around the `HookRunner` port and a workflow's `HookDefinition`. */
export class HookService {
  constructor(private readonly hookRunner: HookRunner) {}

  async run(phase: HookPhase, hooks: HookDefinition): Promise<void> {
    const commands = hooks.commandsFor(phase);
    if (commands.length === 0) return;
    await this.hookRunner.run(phase, commands);
  }
}

