export type HookName =
  | "pre-init"
  | "post-init"
  | "pre-start"
  | "post-start"
  | "pre-finish"
  | "post-finish"
  | "pre-update"
  | "post-update"
  | "pre-publish"
  | "post-publish"
  | "pre-delete"
  | "post-delete"
  | "pre-tag"
  | "post-tag"
  | "pre-checkout"
  | "post-checkout"
  | "pre-rename"
  | "post-rename"
  | "pre-track"
  | "post-track";

export interface HookContext {
  readonly operation: HookName;
  readonly branch?: string;
  readonly branchType?: string;
  readonly base?: string;
  readonly target?: string | string[];
  readonly dryRun?: boolean;
  readonly force?: boolean;
  readonly tagName?: string;
  readonly oldName?: string;
  readonly newName?: string;
  readonly remote?: string;
  readonly extra?: Record<string, unknown>;
  readonly type?: string;
}

export interface HookRunner {
  /** Runs the hook script if it exists; throws if it exits non-zero. */
  run(name: HookName, context: HookContext): Promise<void>;
}
