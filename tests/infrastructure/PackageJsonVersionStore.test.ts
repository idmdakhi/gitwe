import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PackageJsonVersionStore } from "#gitwe/infrastructure/version/PackageJsonVersionStore";
import { Version } from "#gitwe/domain/valueObjects/Version";

describe("PackageJsonVersionStore", () => {
  let dir: string;
  let filePath: string;
  let store: PackageJsonVersionStore;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gitwe-test-"));
    filePath = join(dir, "package.json");
    writeFileSync(filePath, JSON.stringify({ name: "test", version: "1.0.0" }));
    store = new PackageJsonVersionStore(filePath);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("resolves current version from package.json", async () => {
    const version = await store.resolveCurrent();
    expect(version?.toString()).toBe("1.0.0");
  });

  it("returns undefined when version field is missing", async () => {
    writeFileSync(filePath, JSON.stringify({ name: "test" }));
    const version = await store.resolveCurrent();
    expect(version).toBeUndefined();
  });

  it("returns undefined when file doesn't exist", async () => {
    const store2 = new PackageJsonVersionStore(join(dir, "nonexistent.json"));
    const version = await store2.resolveCurrent();
    expect(version).toBeUndefined();
  });

  it("writes version to package.json", async () => {
    const version = Version.parse("2.0.0");
    await store.write(version);

    const content = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(content.version).toBe("2.0.0");
  });

  it("preserves other fields when writing", async () => {
    const original = { name: "test", version: "1.0.0", description: "test desc" };
    writeFileSync(filePath, JSON.stringify(original));

    const version = Version.parse("2.0.0");
    await store.write(version);

    const content = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(content.name).toBe("test");
    expect(content.description).toBe("test desc");
    expect(content.version).toBe("2.0.0");
  });

  it("formats JSON with 2 spaces indent", async () => {
    const version = Version.parse("2.0.0");
    await store.write(version);

    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain('"version": "2.0.0"');
    // بررسی indent
    const lines = content.split("\n");
    expect(lines[1]?.startsWith("  ")).toBe(true);
  });

  it("handles prerelease versions", async () => {
    const version = Version.parse("1.0.0-beta.1");
    await store.write(version);

    const content = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(content.version).toBe("1.0.0-beta.1");
  });
});
