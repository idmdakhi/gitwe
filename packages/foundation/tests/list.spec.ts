import { describe, expect, it } from "vitest";

import { List } from "../src/collections";

describe("List", () => {
  it("adds values", () => {
    const list = new List<number>();

    const next = list.add(10);

    expect(list.size).toBe(0);

    expect(next.size).toBe(1);
  });

  it("removes values", () => {
    const list = new List([1, 2, 3]);

    const next = list.remove(2);

    expect(next.size).toBe(2);
  });

  it("maps values", () => {
    const list = new List([1, 2, 3]);

    const next = list.map((x) => x * 10);

    expect(next.toArray()).toEqual([10, 20, 30]);
  });
});
import { describe, expect, it } from "vitest";

import { List } from "../src/collections";

describe("List", () => {
  it("adds values", () => {
    const list = new List<number>();

    const next = list.add(10);

    expect(list.size).toBe(0);

    expect(next.size).toBe(1);
  });

  it("removes values", () => {
    const list = new List([1, 2, 3]);

    const next = list.remove(2);

    expect(next.size).toBe(2);
  });

  it("maps values", () => {
    const list = new List([1, 2, 3]);

    const next = list.map((x) => x * 10);

    expect(next.toArray()).toEqual([10, 20, 30]);
  });
});
