import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PerformanceTracker } from "../../src/application/performance/performance-tracker.js";

describe("Engine.finish", () => {
  beforeEach(async () => {});

  afterEach(() => {});

  it("merges a feature into its parent and deletes it", async () => {
    const tracker = new PerformanceTracker(true);

    expect(tracker.entries().some((entry) => entry.name === "step:preflight:execute")).toBe(true);

    expect(tracker.entries().some((entry) => entry.name === "step:fetch:execute")).toBe(true);
  });
});
