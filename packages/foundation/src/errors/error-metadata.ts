import type { JsonValue } from "../types/json.js";

export interface ErrorMetadata {
  readonly [key: string]: JsonValue;
}
