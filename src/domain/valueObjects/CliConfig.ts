type CliRawInput = {
  enabled?: boolean;
  commands?: Record<string, string | Record<string, string>>;
  aliases?: Record<string, string>;
  interactive?: boolean;
  autocomplete?: boolean;
  color?: boolean;
  emoji?: boolean;
  hooks?: Record<string, string[]>;
};

// ============================================================
// Class Cli Config
// ============================================================
export class CliConfig {
  constructor(
    public readonly enabled: boolean,
    public readonly commands: Record<string, string | Record<string, string>>,
    public readonly aliases: Record<string, string>,
    public readonly interactive: boolean,
    public readonly autocomplete: boolean,
    public readonly color: boolean,
    public readonly emoji: boolean,
    public readonly hooks: Record<string, string[]>,
  ) {}

  static create(raw: CliRawInput = {}): CliConfig {
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

  /**
   * دریافت قالب دستور بر اساس نام دستور و زیردستور اختیاری.
   * اگر `command` مستقیم یک رشته باشد، آن را برمی‌گرداند.
   * اگر `command` یک شیء باشد و `sub` داده شده باشد، مقدار مربوط به `sub` را برمی‌گرداند.
   */
  getCommandTemplate(command: string, sub?: string): string | undefined {
    const cmd = this.commands[command];
    if (!cmd) return undefined;

    // اگر مقدار از نوع string باشد، همان را برگردان (فقط اگر sub تعیین نشده باشد)
    if (typeof cmd === "string") {
      return sub ? undefined : cmd;
    }

    // در غیر این صورت cmd از نوع Record<string, string> است
    return sub ? cmd[sub] : undefined;
  }
}
