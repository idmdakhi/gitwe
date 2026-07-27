import { describe, it, expect, vi } from "vitest";
import { CompositeVersionStore } from "#gitwe/infrastructure/version/CompositeVersionStore";
import type { VersionStore } from "#gitwe/domain/ports/VersionStore";
import { Version } from "#gitwe/domain/valueObjects/Version";

describe("CompositeVersionStore", () => {
  it("returns highest version from multiple stores", async () => {
    const store1: VersionStore = {
      resolveCurrent: vi.fn().mockResolvedValue(Version.parse("1.2.0")),
      write: vi.fn(),
    };
    const store2: VersionStore = {
      resolveCurrent: vi.fn().mockResolvedValue(Version.parse("1.5.0")),
      write: vi.fn(),
    };
    const store3: VersionStore = {
      resolveCurrent: vi.fn().mockResolvedValue(Version.parse("1.3.0")),
      write: vi.fn(),
    };

    const composite = new CompositeVersionStore([store1, store2, store3], "highest");
    const result = await composite.resolveCurrent();
    expect(result?.toString()).toBe("1.5.0");
  });

  it("returns first when primary is 'first'", async () => {
    const store1: VersionStore = {
      resolveCurrent: vi.fn().mockResolvedValue(Version.parse("1.2.0")),
      write: vi.fn(),
    };
    const store2: VersionStore = {
      resolveCurrent: vi.fn().mockResolvedValue(Version.parse("1.5.0")),
      write: vi.fn(),
    };

    const composite = new CompositeVersionStore([store1, store2], "first");
    const result = await composite.resolveCurrent();
    expect(result?.toString()).toBe("1.2.0");
  });

  it("writes to all stores", async () => {
    const store1: VersionStore = {
      resolveCurrent: vi.fn().mockResolvedValue(Version.parse("1.0.0")),
      write: vi.fn(),
    };
    const store2: VersionStore = {
      resolveCurrent: vi.fn().mockResolvedValue(Version.parse("1.0.0")),
      write: vi.fn(),
    };

    const composite = new CompositeVersionStore([store1, store2]);
    const version = Version.parse("2.0.0");
    await composite.write(version);

    expect(store1.write).toHaveBeenCalledWith(version);
    expect(store2.write).toHaveBeenCalledWith(version);
  });

  it("returns undefined when all stores return undefined", async () => {
    const store1: VersionStore = {
      resolveCurrent: vi.fn().mockResolvedValue(undefined),
      write: vi.fn(),
    };
    const store2: VersionStore = {
      resolveCurrent: vi.fn().mockResolvedValue(undefined),
      write: vi.fn(),
    };

    const composite = new CompositeVersionStore([store1, store2]);
    const result = await composite.resolveCurrent();
    expect(result).toBeUndefined();
  });
});
