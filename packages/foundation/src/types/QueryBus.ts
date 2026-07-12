export interface QueryBus {
  execute<T extends Query, TResult>(query: T): Promise<TResult>;
}
