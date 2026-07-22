import type { HookRunner } from "#gitwe/domain/ports/HookRunner";
import { HookPhase } from "#gitwe/domain/hooks/HookPhase";

export class InMemoryHookRunner implements HookRunner {
  readonly calls: { phase: HookPhase; commands: readonly string[] }[] = [];

  async run(phase: HookPhase, commands: readonly string[]): Promise<void> {
    this.calls.push({ phase, commands });
  }
}
