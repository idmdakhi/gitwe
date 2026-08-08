import type { WorkflowContext } from "./workflow-context.js";
import type { WorkflowStep } from "./workflow-step.js";

export interface Workflow<TContext extends WorkflowContext = WorkflowContext> {
  /** شناسهٔ یکتا (مثلاً 'git-finish') */
  readonly id: string;

  /** عنوان قابل نمایش */
  readonly title: string;

  /** لیست مراحل به‌ترتیب اجرا */
  readonly steps: readonly WorkflowStep<TContext>[];
}
