import type { Identifier } from "./identifier.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseIdentifier<T extends string>(
  value: string,
): Identifier<T> {
  if (!UUID_PATTERN.test(value)) {
    throw new TypeError(`Invalid identifier: ${value}`);
  }

  return value as Identifier<T>;
}
