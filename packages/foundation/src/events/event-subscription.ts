import type { Event } from "./event.js";
import type { EventHandler } from "./event-handler.js";

export interface EventSubscription<TEvent extends Event = Event> {
  readonly type: string;

  readonly handler: EventHandler<TEvent>;
}
