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
  readonly branch?: string | undefined;
  readonly branchType?: string | undefined;
  readonly base?: string | undefined;
  readonly target?: string | string[] | undefined;
  readonly dryRun?: boolean | undefined;
  readonly force?: boolean | undefined;
  readonly tagName?: string | undefined;
  readonly oldName?: string | undefined;
  readonly newName?: string | undefined;
  readonly remote?: string | undefined;
  readonly extra?: Record<string, unknown> | undefined;
  readonly type?: string | undefined;
  readonly config?: string | undefined;
}

export interface HookRunner {
  /** Runs the hook script if it exists; throws if it exits non-zero. */
  run(name: HookName, context: HookContext): Promise<void>;
}
