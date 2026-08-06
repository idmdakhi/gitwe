import type { WorkflowContext } from "./workflow-context.js";

/**
 * یک مرحلهٔ مستقل از Workflow.
 * هر Step فقط مسئول منطق خودش است و از ترتیب یا Engine بی‌خبر است.
 */
export interface WorkflowStep<TContext extends WorkflowContext = WorkflowContext> {
  /** شناسهٔ یکتا (مثلاً 'merge') */
  readonly id: string;

  /** عنوان قابل نمایش (مثلاً 'ادغام در شاخهٔ پایه') */
  readonly title: string;

  /** آیا در شرایط فعلی باید اجرا شود؟ */
  canExecute(context: TContext): Promise<boolean>;

  /** اجرای اولیهٔ مرحله (فقط یک بار) */
  execute(context: TContext): Promise<void>;

  /** ادامهٔ اجرا پس از توقف (مثلاً پس از resolve کردن conflict) */
  resume(context: TContext): Promise<void>;

  /** بازگردانی تغییرات (در هنگام abort) */
  rollback(context: TContext): Promise<void>;

  /** آیا مرحله با موفقیت به پایان رسیده است؟ */
  isCompleted(context: TContext): Promise<boolean>;
}
