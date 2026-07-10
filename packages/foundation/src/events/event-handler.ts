import type { Event } from "./event.js";

export interface EventHandler<TEvent extends Event = Event> {
  handle(event: TEvent): void | Promise<void>;
}
