export class CliConfig {
  constructor(
    public readonly enabled: boolean,
    public readonly commands: Record<string, any>,
    public readonly aliases: Record<string, string>,
    public readonly interactive: boolean,
    public readonly autocomplete: boolean,
    public readonly color: boolean,
    public readonly emoji: boolean,
    public readonly hooks: Record<string, string[]>,
  ) {}

  static create(raw: any = {}) {
    return new CliConfig(
      raw.enabled ?? true,
      raw.commands ?? {},
      raw.aliases ?? {},
      raw.interactive ?? true,
      raw.autocomplete ?? true,
      raw.color ?? true,
      raw.emoji ?? true,
      raw.hooks ?? {},
    );
  }

  getCommandTemplate(command: string, sub?: string): string | undefined {
    if (sub && this.commands[command]?.[sub]) return this.commands[command][sub];
    return this.commands[command];
  }
}
