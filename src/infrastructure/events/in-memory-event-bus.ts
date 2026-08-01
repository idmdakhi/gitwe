import type { EventBus } from "#gitwe/domain/ports/event-bus";
import type { DomainEvent } from "#gitwe/domain/events/domain-event";

/**
 * Default {@link EventBus} implementation: dispatches synchronously to
 * in-process subscribers, with no persistence or cross-process delivery.
 * Sufficient for `gitwe`'s own short-lived CLI process; a consumer
 * embedding `gitwe` as a library can supply a different implementation
 * (e.g. one that also posts to a webhook) without touching application
 * code.
 *
 * @public
 */
export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<(event: DomainEvent) => void | Promise<void>>>();

  async publish(event: DomainEvent): Promise<void> {
    const subscribers = this.handlers.get(event.name);
    if (!subscribers) return;
    for (const handler of subscribers) {
      await handler(event);
    }
  }

  subscribe(eventName: string, handler: (event: DomainEvent) => void | Promise<void>): () => void {
    let subscribers = this.handlers.get(eventName);
    if (!subscribers) {
      subscribers = new Set();
      this.handlers.set(eventName, subscribers);
    }
    subscribers.add(handler);
    return () => subscribers.delete(handler);
  }
}
