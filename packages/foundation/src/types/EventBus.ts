export interface EventBus {
  publish<T extends Event>(event: T): Promise<void>;
}
