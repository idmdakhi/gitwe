import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { UpdateChecker, compareVersions } from "#gitwe/infrastructure/update/Updatechecker";

describe("compareVersions", () => {
  it("returns negative when a < b", () => {
    expect(compareVersions("1.0.0", "1.0.1")).toBeLessThan(0);
    expect(compareVersions("1.9.0", "2.0.0")).toBeLessThan(0);
  });

  it("returns positive when a > b", () => {
    expect(compareVersions("2.1.0", "2.0.9")).toBeGreaterThan(0);
  });

  it("returns 0 for equal versions", () => {
    expect(compareVersions("2.1.0", "2.1.0")).toBe(0);
  });

  it("tolerates a leading 'v' and differing segment counts", () => {
    expect(compareVersions("v1.2", "1.2.0")).toBe(0);
    expect(compareVersions("v1.2.1", "1.2")).toBeGreaterThan(0);
  });
});

describe("UpdateChecker", () => {
  let dir: string;
  let cachePath: string;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gitwe-update-check-"));
    cachePath = join(dir, "update-check.json");
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    rmSync(dir, { recursive: true, force: true });
  });

  function mockRegistryResponse(version: string, ok = true): void {
    fetchSpy.mockResolvedValue({
      ok,
      json: async () => ({ version }),
    });
  }

  it("reports isOutdated: true when the registry has a newer version", async () => {
    mockRegistryResponse("9.9.9");
    const checker = new UpdateChecker({ cachePath });

    const result = await checker.check("1.0.0");

    expect(result).toEqual({ currentVersion: "1.0.0", latestVersion: "9.9.9", isOutdated: true });
  });

  it("reports isOutdated: false when already on the latest version", async () => {
    mockRegistryResponse("1.0.0");
    const checker = new UpdateChecker({ cachePath });

    const result = await checker.check("1.0.0");

    expect(result?.isOutdated).toBe(false);
  });

  it("caches the result so a second check doesn't hit the network again", async () => {
    mockRegistryResponse("2.0.0");
    const checker = new UpdateChecker({ cachePath });

    await checker.check("1.0.0");
    await checker.check("1.0.0");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(existsSync(cachePath)).toBe(true);
    const cached = JSON.parse(readFileSync(cachePath, "utf-8"));
    expect(cached.latestVersion).toBe("2.0.0");
  });

  it("re-checks the network once the cache has expired", async () => {
    mockRegistryResponse("2.0.0");
    const checker = new UpdateChecker({ cachePath, checkIntervalMs: 10 });

    await checker.check("1.0.0");
    await new Promise((resolve) => setTimeout(resolve, 20));
    mockRegistryResponse("3.0.0");
    const second = await checker.check("1.0.0");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(second?.latestVersion).toBe("3.0.0");
  });

  it("returns null (never throws) when the network request fails", async () => {
    fetchSpy.mockRejectedValue(new Error("network down"));
    const checker = new UpdateChecker({ cachePath });

    const result = await checker.check("1.0.0");

    expect(result).toBeNull();
  });

  it("returns null when the registry responds with a non-ok status", async () => {
    mockRegistryResponse("2.0.0", false);
    const checker = new UpdateChecker({ cachePath });

    const result = await checker.check("1.0.0");

    expect(result).toBeNull();
  });

  it("falls back to a stale cache entry if a later network request fails", async () => {
    mockRegistryResponse("2.0.0");
    const checker = new UpdateChecker({ cachePath, checkIntervalMs: 10 });
    await checker.check("1.0.0");

    await new Promise((resolve) => setTimeout(resolve, 20));
    fetchSpy.mockRejectedValue(new Error("network down"));
    const result = await checker.check("1.0.0");

    expect(result?.latestVersion).toBe("2.0.0");
  });

  it("ignores a corrupt cache file instead of throwing", async () => {
    writeFileSync(cachePath, "{not valid json");
    mockRegistryResponse("2.0.0");
    const checker = new UpdateChecker({ cachePath });

    const result = await checker.check("1.0.0");

    expect(result?.latestVersion).toBe("2.0.0");
  });
});
