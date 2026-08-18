import type { HookName } from "../ports/hook-runner.port.js";

export interface HookDefinition {
  /** مسیر اسکریپت یا دستور inline */
  script: string;
  /** شرط اجرا (مثلاً "type == 'release'") */
  when?: string;
  /** در صورت خطا ادامه بده؟ (پیش‌فرض: false) */
  continueOnError?: boolean;
  /** اجرای موازی با hookهای دیگر؟ (پیش‌فرض: false) */
  parallel?: boolean;
  /** ارسال JSON context به STDIN؟ (پیش‌فرض: false) */
  stdin?: boolean;
}

export interface HookConfig {
  /** فعال/غیرفعال کردن کلی hooks */
  readonly enabled: boolean;
  /** مسیر پیش‌فرض برای فایل‌های اسکریپت */
  readonly path: string;
  readonly config: string;
  /** Hookهای inline (دستورات مستقیم) */
  inline?: Partial<Record<HookName, string>>;
  /** Hookهای پیشرفته با تنظیمات کامل */
  advanced?: Partial<Record<HookName, HookDefinition>>;
  /** Hookهای خاص برای هر نوع شاخه */
  typeOverrides?: {
    [typeName: string]: {
      [K in HookName]?: string | HookDefinition;
    };
  };
}
