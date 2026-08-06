// ====== بخش عمومی (جدید) ======
export interface OperationState {
  /** نسخهٔ ساختار فایل */
  version: number;

  /** شناسهٔ عملیات (مثلاً 'finish'، 'start'، ...) */
  operation: string;

  /** مرحلهٔ فعلی (id مرحله) */
  currentStep: string;

  /** شناسهٔ مراحل تکمیل‌شده */
  completedSteps: string[];

  /** داده‌های اختصاصی هر Workflow (مثلاً snapshots, createdTags و ...) */
  data: Record<string, unknown>;

  /** زمان شروع عملیات (ISO string) */
  startedAt: string;
}

// ====== بخش خاص (برای سازگاری با عقب) ======
/** @deprecated از فیلدهای عمومی استفاده کنید */
export interface LegacyFinishState extends OperationState {
  // فیلدهای قدیمی که فعلاً نگهداری می‌شوند
  branch: string;
  branchType: string;
  options: Record<string, unknown>;
  stepIndex: number;
  originalBranch?: string;
  snapshots: Record<string, string>;
  createdTags: string[];
}

export interface OperationStateStore {
  exists(): boolean;
  read(): OperationState | undefined;
  require(): OperationState;
  write(state: OperationState): Promise<void>; // حالا async
  clear(): Promise<void>;
}
