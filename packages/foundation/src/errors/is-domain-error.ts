import { DomainError } from "./domain-error.js";

export function isDomainError(value: unknown): value is DomainError {
  return value instanceof DomainError;
}
