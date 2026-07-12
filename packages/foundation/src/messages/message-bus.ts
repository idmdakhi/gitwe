import type { Message } from "./message.js";
import type { MessageHandler } from "./message-handler.js";

export interface MessageBus {
  register<T extends Message, TResult = void>(
    type: T["type"],
    handler: MessageHandler<T, TResult>,
  ): void;

  unregister<T extends Message, TResult = void>(
    type: T["type"],
    handler: MessageHandler<T, TResult>,
  ): void;
}
