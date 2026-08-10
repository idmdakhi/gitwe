import { describe, expect, it } from "vitest";
import { PerformanceTracker } from "../../src/application/performance/performance-tracker.js";

describe("PerformanceTracker", () => {
  it("does not collect entries when disabled", async () => {
    const tracker = new PerformanceTracker(false);

    await tracker.measure("test", async () => {
      await Promise.resolve();
    });

    expect(tracker.entries()).toHaveLength(0);
    expect(tracker.total()).toBe(0);
  });

  it("collects execution duration when enabled", async () => {
    const tracker = new PerformanceTracker(true);

    await tracker.measure("test", async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    const entries = tracker.entries();

    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("test");
    expect(entries[0].duration).toBeGreaterThanOrEqual(10);
  });

  it("supports manual start/stop", () => {
    const tracker = new PerformanceTracker(true);

    const end = tracker.start("test");

    end();

    expect(tracker.entries()).toHaveLength(1);
    expect(tracker.entries()[0].name).toBe("test");
  });

  it("does not record twice", () => {
    const tracker = new PerformanceTracker(true);

    const end = tracker.start("test");

    end();
    end();

    expect(tracker.entries()).toHaveLength(1);
  });
});
