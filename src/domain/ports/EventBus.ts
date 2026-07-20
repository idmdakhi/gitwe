import { DomainEvent } from "../events/DomainEvent";

/**
 * Port for publishing domain events. `gitwe` is a short-lived CLI process,
 * so this is intentionally simple (fire-and-forget publish) rather than a
 * full message bus — but application services depend on this interface,
 * not on any particular implementation, so a richer event pipeline
 * (webhooks, audit log, CI triggers) can be swapped in later.
 */
export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
}
