import type { EventBus } from "#gitwe/domain/ports/EventBus";
import type { DomainEvent } from "#gitwe/domain/events/DomainEvent";
import type { Logger } from "#gitwe/shared/logging/Logger";
import { NoopLogger } from "#gitwe/infrastructure/logging/NoopLogger";

type Subscriber = (event: DomainEvent) => void;

/**
 * Simple synchronous, in-process event bus. `gitwe` is a short-lived CLI
 * process today, so this just fans events out to in-memory subscribers
 * (e.g. logging) rather than persisting or delivering them externally —
 * but application services depend only on the `EventBus` port, so a
 * durable/queued implementation is a drop-in replacement later.
 */
export class InMemoryEventBus implements EventBus {
  private readonly subscribers: Subscriber[] = [];

  constructor(logger: Logger = new NoopLogger()) {
    this.subscribe((event) => logger.debug(`Event published: ${event.name}`));
  }

  subscribe(subscriber: Subscriber): void {
    this.subscribers.push(subscriber);
  }

  async publish(event: DomainEvent): Promise<void> {
    for (const subscriber of this.subscribers) {
      subscriber(event);
    }
  }
}
