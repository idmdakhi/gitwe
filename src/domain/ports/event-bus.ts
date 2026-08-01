import { DomainEvent } from "#gitwe/domain/events/domain-event";

/**
 * Port for publishing {@link DomainEvent}s. Application services depend
 * only on this interface, never on a concrete implementation, so a
 * consumer can supply a richer pipeline (webhooks, an audit log, CI
 * triggers) without touching domain or application code. See
 * `infrastructure/events/InMemoryEventBus` for the default implementation.
 *
 * @public
 */
export interface EventBus {
  /** Publishes an event to every registered subscriber. */
  publish(event: DomainEvent): Promise<void>;
  /** Registers a subscriber for one event name (e.g. `"branch.finished"`). Returns an unsubscribe function. */
  subscribe(eventName: string, handler: (event: DomainEvent) => void | Promise<void>): () => void;
}
