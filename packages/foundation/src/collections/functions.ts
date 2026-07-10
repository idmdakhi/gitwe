import { List } from "./list.js";

export function empty<T>(): List<T> {
  return new List();
}

export function from<T>(values: Iterable<T>): List<T> {
  return new List([...values]);
}
