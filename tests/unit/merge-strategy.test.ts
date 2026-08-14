import { describe, expect, it } from "vitest";
import {
  isMergeStrategy,
  describeStrategy,
  strategyCanConflict,
  ALL_MERGE_STRATEGIES,
} from "../../src/domain/merge-strategy.js";

describe("MergeStrategy", () => {
  it("recognises all strategies", () => {
    for (const s of ALL_MERGE_STRATEGIES) {
      expect(isMergeStrategy(s)).toBe(true);
    }
    expect(isMergeStrategy("nope")).toBe(false);
  });

  it("describes each strategy", () => {
    expect(describeStrategy("cherry-pick")).toMatch(/cherry-pick/i);
    expect(describeStrategy("rebase-merge")).toMatch(/merge commit/i);
  });

  it("all strategies can conflict", () => {
    for (const s of ALL_MERGE_STRATEGIES) {
      expect(strategyCanConflict(s)).toBe(true);
    }
  });
});
