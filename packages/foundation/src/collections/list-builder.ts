import { List } from "./list.js";

export class ListBuilder<T> {
  private readonly values: T[] = [];

  public add(value: T): this {
    this.values.push(value);

    return this;
  }

  public build(): List<T> {
    return new List(this.values);
  }
}
