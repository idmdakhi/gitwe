import type { Message } from "./message.js";

export interface MessageDispatcher {
  dispatch<T extends Message, TResult = void>(message: T): Promise<TResult>;
}
