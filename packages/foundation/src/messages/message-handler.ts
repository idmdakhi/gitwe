import type { Message } from "./message.js";

export interface MessageHandler<
  TMessage extends Message = Message,
  TResult = void,
> {
  handle(message: TMessage): TResult | Promise<TResult>;
}
