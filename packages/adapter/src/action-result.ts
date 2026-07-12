export interface ActionResult<TResult> {
  readonly success: boolean;

  readonly output: TResult;
}
