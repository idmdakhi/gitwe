import type { Collection } from "./collection.js";

export class List<T> implements Collection<T> {
  private readonly items: readonly T[];

  public constructor(values: readonly T[] = []) {
    this.items = Object.freeze([...values]);
  }

  public get size(): number {
    return this.items.length;
  }

  public isEmpty(): boolean {
    return this.items.length === 0;
  }

  public has(value: T): boolean {
    return this.items.includes(value);
  }

  public add(value: T): List<T> {
    return new List([...this.items, value]);
  }

  public addRange(values: Iterable<T>): List<T> {
    return new List([...this.items, ...values]);
  }

  public remove(value: T): List<T> {
    return new List(this.items.filter((item) => item !== value));
  }

  public map<U>(mapper: (value: T, index: number) => U): List<U> {
    return new List(this.items.map(mapper));
  }

  public filter(predicate: (value: T, index: number) => boolean): List<T> {
    return new List(this.items.filter(predicate));
  }

  public find(predicate: (value: T) => boolean): T | undefined {
    return this.items.find(predicate);
  }

  public first(): T | undefined {
    return this.items[0];
  }

  public last(): T | undefined {
    return this.items[this.items.length - 1];
  }

  public forEach(callback: (value: T, index: number) => void): void {
    this.items.forEach(callback);
  }

  public toArray(): readonly T[] {
    return this.items;
  }

  public [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]();
  }
}
