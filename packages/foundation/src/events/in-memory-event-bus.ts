import type { Event } from "./event.js";
import type { EventBus } from "./event-bus.js";
import type { EventHandler } from "./event-handler.js";

export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<EventHandler<any>>>();

  public subscribe<T extends Event>(
    type: T["type"],

    handler: EventHandler<T>,
  ): void {
    let set = this.handlers.get(type);

    if (!set) {
      set = new Set();

      this.handlers.set(type, set);
    }

    set.add(handler);
  }

  public unsubscribe<T extends Event>(
    type: T["type"],

    handler: EventHandler<T>,
  ): void {
    this.handlers.get(type)?.delete(handler);
  }

  public async publish<T extends Event>(event: T): Promise<void> {
    const handlers = this.handlers.get(event.type);

    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      await handler.handle(event);
    }
  }
}
