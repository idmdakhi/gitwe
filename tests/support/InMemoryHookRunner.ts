import type { HookRunner } from "../../src/domain/ports/HookRunner";
import { HookPhase } from "../../src/domain/hooks/HookPhase";

export class InMemoryHookRunner implements HookRunner {
  readonly calls: { phase: HookPhase; commands: readonly string[] }[] = [];

  async run(phase: HookPhase, commands: readonly string[]): Promise<void> {
    this.calls.push({ phase, commands });
  }
}
