export interface Action<TInput, TResult> {
  readonly type: string;

  execute(input: TInput): Promise<TResult>;
}
