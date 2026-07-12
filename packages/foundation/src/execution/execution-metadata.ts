export interface ExecutionMetadata {
  readonly workflow: string;

  readonly version: string;

  readonly startedAt?: Date;

  readonly finishedAt?: Date;

  readonly retry: number;

  readonly timeout?: number;
}
