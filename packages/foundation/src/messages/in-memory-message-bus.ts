import type { Message } from "./message.js";
import type { MessageBus } from "./message-bus.js";
import type { MessageDispatcher } from "./message-dispatcher.js";
import type { MessageHandler } from "./message-handler.js";

export class InMemoryMessageBus implements MessageBus, MessageDispatcher {
  private readonly handlers = new Map<string, MessageHandler<any, any>>();

  public register(type: string, handler: MessageHandler): void {
    this.handlers.set(type, handler);
  }

  public unregister(type: string): void {
    this.handlers.delete(type);
  }

  public async dispatch(message: Message): Promise<any> {
    const handler = this.handlers.get(message.type);

    if (!handler) {
      throw new Error(`Handler '${message.type}' not found.`);
    }

    return handler.handle(message);
  }
}
