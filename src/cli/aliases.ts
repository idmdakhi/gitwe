import { Command } from "commander";

/**
 * ثبت aliasهای تعریف‌شده در فایل پیکربندی.
 * هر alias به‌صورت "نام: دستور کامل" تعریف می‌شود، مثلاً "fs: finish feature".
 */
export function applyAliases(program: Command, aliases: Record<string, string>): void {
  for (const [alias, fullCommand] of Object.entries(aliases)) {
    const parts = fullCommand.trim().split(/\s+/);
    const cmdName = parts[0];
    if (!cmdName) {
      console.warn(`[gitwe] Alias "${alias}" has empty command`);
      continue;
    }
    const args = parts.slice(1);

    // پیدا کردن command اصلی
    const targetCommand = program.commands.find((c) => c.name() === cmdName);
    if (!targetCommand) {
      console.warn(`[gitwe] Alias "${alias}" points to unknown command "${cmdName}"`);
      continue;
    }

    // ایجاد یک command جدید با نام alias
    const aliasCmd = new Command(alias)
      .description(`Alias for "${fullCommand}"`)
      .action(async (...providedArgs: string[]) => {
        // ترکیب آرگومان‌های ثابت با آرگومان‌های ورودی کاربر
        const allArgs = [...args, ...providedArgs];
        // استفاده از مقدار پیش‌فرض برای argv[0] و argv[1] در صورت undefined بودن
        const argv0 = process.argv[0] ?? "node";
        const argv1 = process.argv[1] ?? "";
        // فراخوانی action اصلی command
        await targetCommand.parseAsync([argv0, argv1, cmdName, ...allArgs]);
      });

    // کپی کردن گزینه‌ها (options) از command اصلی
    for (const option of targetCommand.options) {
      aliasCmd.addOption(option);
    }

    program.addCommand(aliasCmd);
  }
}
