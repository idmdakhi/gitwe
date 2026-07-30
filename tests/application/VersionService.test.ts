import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  VersionService,
  DirtyTreeError,
  VersionSourceMissingError,
  VersionTagExistsError,
} from "#gitwe/application/services/VersionService";
import type { VersionStore } from "#gitwe/domain/ports/VersionStore";
import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { ChangelogWriter } from "#gitwe/domain/ports/ChangelogWriter";
import type { Logger } from "#gitwe/shared/logging/Logger";
import { Version } from "#gitwe/domain/valueObjects/Version";

describe("VersionService", () => {
  let mockStore: VersionStore;
  let mockGit: GitRepository;
  let mockChangelog: ChangelogWriter;
  let mockLogger: Logger;
  let service: VersionService;

  beforeEach(() => {
    mockStore = {
      resolveCurrent: vi.fn().mockResolvedValue(Version.parse("1.0.0")),
      write: vi.fn(),
    };
    mockGit = {
      isWorkingTreeClean: vi.fn().mockResolvedValue(true),
      runRaw: vi.fn().mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 }),
    } as unknown as GitRepository;
    mockChangelog = { append: vi.fn().mockResolvedValue("CHANGELOG.md") };
    mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

    service = new VersionService({
      stores: [mockStore],
      git: mockGit,
      changelogWriter: mockChangelog,
      logger: mockLogger,
      requireCleanTree: true,
      tagPrefix: "v",
    });
  });

  describe("resolveCurrent", () => {
    it("returns version from store", async () => {
      const version = await service.resolveCurrent();
      expect(version?.toString()).toBe("1.0.0");
    });

    it("returns undefined when store has no version", async () => {
      mockStore.resolveCurrent = vi.fn().mockResolvedValue(undefined);
      const version = await service.resolveCurrent();
      expect(version).toBeUndefined();
    });

    it("tries multiple stores in order", async () => {
      const store2: VersionStore = {
        resolveCurrent: vi.fn().mockResolvedValue(Version.parse("1.2.0")),
        write: vi.fn(),
      };
      const service2 = new VersionService({
        stores: [mockStore, store2],
        git: mockGit,
        logger: mockLogger,
        requireCleanTree: false,
        tagPrefix: "v",
      });
      const version = await service2.resolveCurrent();
      expect(version?.toString()).toBe("1.0.0");
    });
  });

  describe("bump", () => {
    it("bumps patch version", async () => {
      const result = await service.bump("patch");
      expect(result.previous.toString()).toBe("1.0.0");
      expect(result.next.toString()).toBe("1.0.1");
      expect(result.tag).toBe("v1.0.1");
      expect(mockStore.write).toHaveBeenCalled();
    });

    it("bumps minor version", async () => {
      const result = await service.bump("minor");
      expect(result.next.toString()).toBe("1.1.0");
    });

    it("bumps major version", async () => {
      const result = await service.bump("major");
      expect(result.next.toString()).toBe("2.0.0");
    });

    it("bumps prerelease", async () => {
      const result = await service.bump("prerelease", "beta");
      // با توجه به اصلاح متد bump، پچ افزایش نمی‌یابد
      expect(result.next.toString()).toBe("1.0.0-beta.1");
    });

    it("increments prerelease number on subsequent bumps", async () => {
      mockStore.resolveCurrent = vi.fn().mockResolvedValue(Version.parse("1.0.0-beta.1"));
      const result = await service.bump("prerelease", "beta");
      expect(result.next.toString()).toBe("1.0.0-beta.2");
    });

    it("does nothing on dry-run", async () => {
      const result = await service.bump("patch", undefined, true);
      // در حالت dry-run، نباید هیچ تغییری در git یا store ایجاد شود
      expect(mockStore.write).not.toHaveBeenCalled();
      expect(mockGit.runRaw).not.toHaveBeenCalled();
      expect(mockChangelog.append).not.toHaveBeenCalled();
      // اما result باید شامل مقادیر محاسبه‌شده باشد
      expect(result.previous.toString()).toBe("1.0.0");
      expect(result.next.toString()).toBe("1.0.1");
      expect(result.tag).toBe("v1.0.1");
    });

    it("throws when working tree is dirty and requireCleanTree is true", async () => {
      mockGit.isWorkingTreeClean = vi.fn().mockResolvedValue(false);
      await expect(service.bump("patch")).rejects.toThrow(DirtyTreeError);
    });

    it("does not throw when working tree is dirty but requireCleanTree is false", async () => {
      const service2 = new VersionService({
        stores: [mockStore],
        git: mockGit,
        logger: mockLogger,
        requireCleanTree: false,
        tagPrefix: "v",
      });
      mockGit.isWorkingTreeClean = vi.fn().mockResolvedValue(false);
      await expect(service2.bump("patch")).resolves.not.toThrow();
    });

    it("throws when no version found", async () => {
      mockStore.resolveCurrent = vi.fn().mockResolvedValue(undefined);
      await expect(service.bump("patch")).rejects.toThrow(VersionSourceMissingError);
    });

    it("throws when tag already exists", async () => {
      mockGit.runRaw = vi.fn().mockImplementation((args: string[]) => {
        if (args[0] === "rev-parse" && args[1] === "v1.0.1") {
          return Promise.resolve({ stdout: "somehash", stderr: "", exitCode: 0 });
        }
        return Promise.resolve({ stdout: "", stderr: "", exitCode: 0 });
      });
      await expect(service.bump("patch")).rejects.toThrow(VersionTagExistsError);
      expect(mockStore.write).not.toHaveBeenCalled();
    });

    it("generates changelog when writer is provided", async () => {
      await service.bump("patch");
      expect(mockChangelog.append).toHaveBeenCalledWith({
        version: expect.any(Version),
        fromRef: expect.any(String),
        toRef: "HEAD",
      });
    });

    it("handles no changelog writer", async () => {
      const service2 = new VersionService({
        stores: [mockStore],
        git: mockGit,
        logger: mockLogger,
        requireCleanTree: false,
        tagPrefix: "v",
      });
      await expect(service2.bump("patch")).resolves.not.toThrow();
    });
  });

  describe("tag", () => {
    it("creates a tag with default message", async () => {
      const version = Version.parse("1.2.3");
      const tag = await service.tag(version);
      expect(tag).toBe("v1.2.3");
      expect(mockGit.runRaw).toHaveBeenCalledWith(["tag", "-a", "v1.2.3", "-m", "Release v1.2.3"]);
    });

    it("creates a tag with custom message", async () => {
      const version = Version.parse("1.2.3");
      const tag = await service.tag(version, "Custom message");
      expect(tag).toBe("v1.2.3");
      expect(mockGit.runRaw).toHaveBeenCalledWith(["tag", "-a", "v1.2.3", "-m", "Custom message"]);
    });
  });
});
