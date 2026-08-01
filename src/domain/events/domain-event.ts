/**
 * Base class for every domain event published through {@link EventBus}.
 *
 * @public
 */
export abstract class DomainEvent {
  /** Timestamp captured at construction time. */
  readonly occurredAt: Date = new Date();
  /** Stable, unique event type name (e.g. `"branch.started"`). */
  abstract readonly name: string;
}
