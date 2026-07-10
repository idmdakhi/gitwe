import type { Event } from "./event.js";
import type { EventHandler } from "./event-handler.js";

export interface EventBus {
  subscribe<T extends Event>(
    type: T["type"],

    handler: EventHandler<T>,
  ): void;

  unsubscribe<T extends Event>(
    type: T["type"],

    handler: EventHandler<T>,
  ): void;

  publish<T extends Event>(event: T): Promise<void>;
}
