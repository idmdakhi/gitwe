export abstract class DomainEvent {
  readonly occurredAt: Date = new Date();
  readonly eventId: string = crypto.randomUUID();
  readonly correlationId?: string;
  readonly causationId?: string;

  abstract readonly name: string;

  constructor(correlationId?: string, causationId?: string) {
    this.correlationId = correlationId;
    this.causationId = causationId;
  }
}
