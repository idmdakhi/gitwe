import { describe, expect, it } from "vitest";

import {
  fail,
  flatMap,
  isFailure,
  isSuccess,
  map,
  ok,
} from "../src/result/index.js";

describe("Result", () => {
  it("creates success", () => {
    const result = ok(10);

    expect(isSuccess(result)).toBe(true);
  });

  it("creates failure", () => {
    const result = fail(new Error("failed"));

    expect(isFailure(result)).toBe(true);
  });

  it("maps success", () => {
    const result = map(ok(10), (value) => value * 2);

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value).toBe(20);
    }
  });

  it("flat maps", () => {
    const result = flatMap(ok(5), (value) => ok(value + 1));

    expect(result.ok).toBe(true);
  });
});
