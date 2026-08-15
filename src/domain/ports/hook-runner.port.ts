export type HookName =
  | "pre-start" | "post-start"
  | "pre-finish" | "post-finish"
  | "pre-update" | "post-update"
  | "pre-publish" | "post-publish"
  | "pre-delete" | "post-delete";

export interface HookContext {
  readonly branch?: string;
  readonly branchType?: string;
  readonly base?: string;
}

export interface HookRunner {
  /** Runs the hook script if it exists; throws if it exits non-zero. */
  run(name: HookName, context: HookContext): Promise<void>;
}
