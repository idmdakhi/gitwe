// src/kernel/state/BranchState.ts
export enum BranchState {
  /** شاخه تازه ایجاد شده */
  CREATED = "created",
  /** در حال توسعه */
  IN_PROGRESS = "in_progress",
  /** آماده برای Merge */
  READY = "ready",
  /** Merge شده به Target (ها) */
  MERGED = "merged",
  /** Tag ایجاد شده */
  TAGGED = "tagged",
  /** نسخه به‌روز شده */
  VERSION_BUMPED = "version_bumped",
  /** شاخه حذف شده */
  DELETED = "deleted",
  /** به Remote ارسال شده */
  PUSHED = "pushed",
  /** کامل شده (پایان کار) */
  COMPLETED = "completed",
  /** خطا */
  FAILED = "failed",
}

export type Transition = {
  from: BranchState;
  to: BranchState;
  /** نام Capability یا عملیاتی که این انتقال را انجام می‌دهد */
  trigger: string;
  /** توضیحات */
  description?: string;
};

/**
 * State Machine برای مدیریت چرخه‌ی عمر شاخه
 */
export class BranchStateMachine {
  private static readonly transitions: Transition[] = [
    { from: BranchState.CREATED, to: BranchState.IN_PROGRESS, trigger: "start.work" },
    { from: BranchState.IN_PROGRESS, to: BranchState.READY, trigger: "ready" },
    { from: BranchState.READY, to: BranchState.MERGED, trigger: "merge" },
    { from: BranchState.MERGED, to: BranchState.VERSION_BUMPED, trigger: "version.bump" },
    { from: BranchState.VERSION_BUMPED, to: BranchState.TAGGED, trigger: "tag" },
    { from: BranchState.TAGGED, to: BranchState.PUSHED, trigger: "push" },
    { from: BranchState.PUSHED, to: BranchState.COMPLETED, trigger: "complete" },
    { from: BranchState.MERGED, to: BranchState.DELETED, trigger: "delete" },
    { from: BranchState.DELETED, to: BranchState.COMPLETED, trigger: "complete" },
    // انتقال‌های خطا
    { from: BranchState.IN_PROGRESS, to: BranchState.FAILED, trigger: "error" },
    { from: BranchState.READY, to: BranchState.FAILED, trigger: "error" },
    { from: BranchState.MERGED, to: BranchState.FAILED, trigger: "error" },
  ];

  private currentState: BranchState;

  constructor(initialState: BranchState = BranchState.CREATED) {
    this.currentState = initialState;
  }

  get state(): BranchState {
    return this.currentState;
  }

  canTransition(trigger: string): boolean {
    return BranchStateMachine.transitions.some(
      (t) => t.from === this.currentState && t.trigger === trigger,
    );
  }

  transition(trigger: string): BranchState {
    const transition = BranchStateMachine.transitions.find(
      (t) => t.from === this.currentState && t.trigger === trigger,
    );
    if (!transition) {
      throw new Error(`Invalid transition from "${this.currentState}" with trigger "${trigger}"`);
    }
    this.currentState = transition.to;
    return this.currentState;
  }

  // متدهای کمکی برای سناریوهای رایج
  startWork(): BranchState {
    return this.transition("start.work");
  }

  markReady(): BranchState {
    return this.transition("ready");
  }

  markMerged(): BranchState {
    return this.transition("merge");
  }

  markVersionBumped(): BranchState {
    return this.transition("version.bump");
  }

  markTagged(): BranchState {
    return this.transition("tag");
  }

  markPushed(): BranchState {
    return this.transition("push");
  }

  markDeleted(): BranchState {
    return this.transition("delete");
  }

  markCompleted(): BranchState {
    return this.transition("complete");
  }

  markFailed(): BranchState {
    return this.transition("error");
  }

  isComplete(): boolean {
    return this.currentState === BranchState.COMPLETED;
  }

  isFailed(): boolean {
    return this.currentState === BranchState.FAILED;
  }

  isInProgress(): boolean {
    return this.currentState === BranchState.IN_PROGRESS;
  }
}
