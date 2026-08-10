import { ResolvedBranch } from "../../domain/entities.js";
import type { OperationState } from "./operation-state.js";

export interface WorkflowContext {
  /** نام عملیات در حال اجرا (مثلاً 'finish') */
  readonly operation: string;
  /** وضعیت فعلی عملیات */
  readonly state: OperationState;
  readonly resolvedBranch: ResolvedBranch;

  /** ذخیره‌سازی وضعیت فعلی */
  saveState(): Promise<void>;
  /** پاک‌کردن وضعیت ذخیره‌شده */
  clearState(): Promise<void>;
}
