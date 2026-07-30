import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { registerVersionCommand } from "#gitwe/cli/commands/version";
import { registerVersionBumpCommand } from "#gitwe/cli/commands/version-bump";

vi.mock("#gitwe/cli/container", () => ({
  Container: class {
    kernel = {
      run: vi.fn(),
    };
  },
}));

describe("Version CLI Commands", () => {
  let program: Command;
  let container: any;
  let getContainer: () => any;
  let getJson: () => boolean;
  let consoleLog: any;
  let consoleError: any;

  beforeEach(() => {
    program = new Command();
    container = {
      kernel: {
        run: vi.fn(),
      },
    };
    getContainer = () => container;
    getJson = () => false;
    consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("version command", () => {
    it("shows current version", async () => {
      container.kernel.run.mockResolvedValue({
        version: "1.2.3",
        source: "git-tag",
        isPrerelease: false,
        tagPrefix: "v",
      });

      registerVersionCommand(program, getContainer, getJson);
      await program.parseAsync(["node", "script", "version"]);

      expect(consoleLog).toHaveBeenCalledWith("Current version: 1.2.3");
      expect(consoleLog).toHaveBeenCalledWith("Source: git-tag");
      expect(consoleLog).toHaveBeenCalledWith("Tag prefix: v");
    });

    it("shows prerelease warning", async () => {
      container.kernel.run.mockResolvedValue({
        version: "1.2.3-beta.1",
        source: "git-tag",
        isPrerelease: true,
        tagPrefix: "v",
      });

      registerVersionCommand(program, getContainer, getJson);
      await program.parseAsync(["node", "script", "version"]);

      expect(consoleLog).toHaveBeenCalledWith("⚠️  Prerelease version");
    });

    it("outputs JSON when --json flag is provided", async () => {
      const mockProgram = new Command();
      const getJsonMock = vi.fn().mockReturnValue(true);
      registerVersionCommand(mockProgram, getContainer, getJsonMock);
      await mockProgram.parseAsync(["node", "script", "version", "--json"]);

      expect(container.kernel.run).toHaveBeenCalled();
    });
  });

  describe("bump command", () => {
    it("bumps patch", async () => {
      container.kernel.run.mockResolvedValue({
        previous: "1.0.0",
        next: "1.0.1",
        tag: "v1.0.1",
        dryRun: false,
        changelogPath: "CHANGELOG.md",
      });

      registerVersionBumpCommand(program, getContainer, getJson);
      await program.parseAsync(["node", "script", "bump", "--patch"]);

      expect(container.kernel.run).toHaveBeenCalledWith("version:bump", {
        kind: "patch",
        prereleaseId: undefined,
        dryRun: false,
      });
      expect(consoleLog).toHaveBeenCalledWith("✅ bumped 1.0.0 → 1.0.1");
      expect(consoleLog).toHaveBeenCalledWith("🏷️  Tag: v1.0.1");
      expect(consoleLog).toHaveBeenCalledWith("📝 Changelog: CHANGELOG.md");
    });

    it("bumps minor", async () => {
      registerVersionBumpCommand(program, getContainer, getJson);
      await program.parseAsync(["node", "script", "bump", "--minor"]);

      expect(container.kernel.run).toHaveBeenCalledWith("version:bump", {
        kind: "minor",
        prereleaseId: undefined,
        dryRun: false,
      });
    });

    it("bumps major", async () => {
      registerVersionBumpCommand(program, getContainer, getJson);
      await program.parseAsync(["node", "script", "bump", "--major"]);

      expect(container.kernel.run).toHaveBeenCalledWith("version:bump", {
        kind: "major",
        prereleaseId: undefined,
        dryRun: false,
      });
    });

    it("bumps prerelease", async () => {
      registerVersionBumpCommand(program, getContainer, getJson);
      await program.parseAsync(["node", "script", "bump", "--prerelease", "beta"]);

      expect(container.kernel.run).toHaveBeenCalledWith("version:bump", {
        kind: "prerelease",
        prereleaseId: "beta",
        dryRun: false,
      });
    });

    it("uses default prerelease id", async () => {
      registerVersionBumpCommand(program, getContainer, getJson);
      await program.parseAsync(["node", "script", "bump", "--prerelease"]);

      expect(container.kernel.run).toHaveBeenCalledWith("version:bump", {
        kind: "prerelease",
        prereleaseId: "beta",
        dryRun: false,
      });
    });

    it("shows dry-run message", async () => {
      container.kernel.run.mockResolvedValue({
        previous: "1.0.0",
        next: "1.0.1",
        tag: "v1.0.1",
        dryRun: true,
        changelogPath: "CHANGELOG.md",
      });

      registerVersionBumpCommand(program, getContainer, getJson);
      await program.parseAsync(["node", "script", "bump", "--patch", "--dry-run"]);

      expect(consoleLog).toHaveBeenCalledWith("✅ would bump 1.0.0 → 1.0.1");
    });

    it("exits with error when no bump type specified", async () => {
      const exitMock = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

      // اطمینان از اینکه mock Container به درستی کار کند
      registerVersionBumpCommand(program, getContainer, getJson);
      await program.parseAsync(["node", "script", "bump"]);

      expect(consoleError).toHaveBeenCalledWith(
        "❌ Please specify --major, --minor, --patch, or --prerelease",
      );
      expect(exitMock).toHaveBeenCalledWith(1);

      exitMock.mockRestore();
    });
  });
});
