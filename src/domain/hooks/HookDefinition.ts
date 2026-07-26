import { HookPhase } from "#gitwe/domain/hooks/HookPhase";

/** Shell commands to run at each lifecycle phase of a workflow action. */
export class HookDefinition {
  private constructor(
    private readonly commandsByPhase: ReadonlyMap<HookPhase, readonly string[]>,
  ) {}

  static create(props: {
    preStart?: string[];
    postStart?: string[];
    preFinish?: string[];
    postFinish?: string[];
  }): HookDefinition {
    const map = new Map<HookPhase, readonly string[]>([
      [HookPhase.PreStart, props.preStart ?? []],
      [HookPhase.PostStart, props.postStart ?? []],
      [HookPhase.PreFinish, props.preFinish ?? []],
      [HookPhase.PostFinish, props.postFinish ?? []],
    ]);
    return new HookDefinition(map);
  }

  static empty(): HookDefinition {
    return HookDefinition.create({});
  }

  commandsFor(phase: HookPhase): readonly string[] {
    return this.commandsByPhase.get(phase) ?? [];
  }
}
