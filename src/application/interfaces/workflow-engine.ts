import type { Workflow } from "./workflow.js";
import type { WorkflowContext } from "./workflow-context.js";

export interface WorkflowEngine<TContext extends WorkflowContext = WorkflowContext> {
  /**
   * اجرای Workflow از ابتدا.
   * اگر قبلاً وضعیتی وجود داشته باشد، آن را نادیده می‌گیرد.
   */
  execute(workflow: Workflow<TContext>, context: TContext): Promise<void>;

  /**
   * ادامهٔ Workflow متوقف‌شده (بر اساس وضعیت ذخیره‌شده).
   * در صورت نبود وضعیت، خطا پرتاب می‌کند.
   */
  resume(workflow: Workflow<TContext>, context: TContext): Promise<void>;

  /**
   * لغو Workflow در حال اجرا و بازگردانی همهٔ تغییرات.
   */
  abort(workflow: Workflow<TContext>, context: TContext): Promise<void>;
}
