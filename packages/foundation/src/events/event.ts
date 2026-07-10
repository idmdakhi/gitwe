import type { JsonObject } from "../types/json.js";

export interface Event<TPayload extends JsonObject = JsonObject> {
  readonly id: string;

  readonly type: string;

  readonly occurredAt: Date;

  readonly payload: TPayload;
}
