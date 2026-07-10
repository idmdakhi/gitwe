import { describe, expect, it } from "vitest";

import {
  some,
  none,
  map,
  flatMap,
  filter,
  isSome,
  isNone,
} from "../src/option/index.js";

describe("Option", () => {
  it("creates Some", () => {
    const value = some(10);

    expect(isSome(value)).toBe(true);
  });

  it("creates None", () => {
    const value = none();

    expect(isNone(value)).toBe(true);
  });

  it("maps", () => {
    const result = map(
      some(10),

      (value) => value * 2,
    );

    expect(result.some).toBe(true);
  });

  it("filters", () => {
    const result = filter(
      some(20),

      (value) => value > 10,
    );

    expect(result.some).toBe(true);
  });

  it("flat maps", () => {
    const result = flatMap(
      some(5),

      (value) => some(value + 1),
    );

    expect(result.some).toBe(true);
  });
});
