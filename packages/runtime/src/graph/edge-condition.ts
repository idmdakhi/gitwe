import type { JsonObject } from "@gwe/foundation";

export interface EdgeCondition {
  readonly type: string;

  readonly config: JsonObject;
}
