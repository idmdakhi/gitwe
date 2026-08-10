export type HookName =
  | "pre-start"
  | "post-start"
  | "pre-finish"
  | "post-finish"
  | "pre-update"
  | "post-update"
  | "pre-publish"
  | "post-publish"
  | "pre-delete"
  | "post-delete";

export interface HookContext {
  branch?: string;
  branchType?: string;
  base?: string;
  [key: string]: string | undefined;
}

/** Port for running lifecycle hooks around workflow operations. */
export interface HookRunner {
  run(name: HookName, context: HookContext): Promise<void>;
}
