export class ExecutionContext {
  readonly startedAt = new Date();

  readonly values = new Map<string, unknown>();

  readonly logs: string[] = [];

  readonly events: string[] = [];

  readonly errors: Error[] = [];

  currentStep = "";

  cancelled = false;
}
