import { describe, expect, it } from "vitest";

import { ShellGitRepository } from "../../../src/infrastructure/git/shell-git-repository.js";
import { VersionCalculator } from "../../../src/domain/versioning/version-calculator.js";

describe("Version bump", () => {
  const git = new ShellGitRepository({ cwd: process.cwd() });

  it("bumps patch", () => {
    expect(git.bumpVersion("1.0.0", "patch")).toBe("1.0.1");
  });

  it("bumps patch from non-zero patch", () => {
    expect(git.bumpVersion("1.4.7", "patch")).toBe("1.4.8");
  });

  it("bumps minor", () => {
    expect(git.bumpVersion("1.0.0", "minor")).toBe("1.1.0");
  });

  it("resets patch when bumping minor", () => {
    expect(git.bumpVersion("1.4.7", "minor")).toBe("1.5.0");
  });

  it("bumps major", () => {
    expect(git.bumpVersion("1.4.7", "major")).toBe("2.0.0");
  });

  it("resets minor and patch when bumping major", () => {
    expect(git.bumpVersion("1.4.7", "major")).toBe("2.0.0");
  });

  it("bumps prerelease", () => {
    expect(git.bumpVersion("1.0.0", "prerelease")).toBe("1.0.0-alpha.1");
    expect(git.bumpVersion("1.0.0-alpha.1", "prerelease")).toBe("1.0.0-alpha.2");
    expect(git.bumpVersion("1.0.0-beta.3", "prerelease")).toBe("1.0.0-beta.4");
  });

  it("parses version", () => {
    expect(git.parseVersion("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(git.parseVersion("1.2.3-alpha.1")).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: "alpha.1",
    });
    expect(git.parseVersion("invalid")).toBeNull();
  });

  it("renders tag name", () => {
    const format = "{{tagPrefix}}{{major}}.{{minor}}.{{patch}}";
    const version = { tagPrefix: "v", major: 1, minor: 2, patch: 3 };
    expect(git.renderTagName(format, version)).toBe("v1.2.3");

    const formatWithPrerelease = "{{tagPrefix}}{{major}}.{{minor}}.{{patch}}-{{prerelease}}";
    const versionWithPrerelease = {
      tagPrefix: "v",
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: "alpha.1",
    };
    expect(git.renderTagName(formatWithPrerelease, versionWithPrerelease)).toBe("v1.2.3-alpha.1");

    const formatWithConditional =
      "{{tagPrefix}}{{major}}.{{minor}}.{{patch}}{{#if prerelease}}-{{prerelease}}{{/if}}";
    expect(git.renderTagName(formatWithConditional, versionWithPrerelease)).toBe("v1.2.3-alpha.1");
    expect(git.renderTagName(formatWithConditional, version)).toBe("v1.2.3");
  });
});

describe("VersionCalculator", () => {
  describe("parse", () => {
    it("parses a valid semantic version", () => {
      expect(VersionCalculator.parse("1.2.3")).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
      });
    });

    it("parses a prerelease version", () => {
      expect(VersionCalculator.parse("1.2.3-beta.1")).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: "beta.1",
      });
    });

    it("rejects an invalid version", () => {
      expect(() => VersionCalculator.parse("1.2")).toThrow("Invalid semantic version: 1.2");
    });
  });

  describe("bump", () => {
    describe("major", () => {
      it("increments major and resets minor and patch", () => {
        expect(VersionCalculator.bump("1.4.7", "major")).toBe("2.0.0");
      });

      it("works with zero version", () => {
        expect(VersionCalculator.bump("0.2.5", "major")).toBe("1.0.0");
      });
    });

    describe("minor", () => {
      it("increments minor and resets patch", () => {
        expect(VersionCalculator.bump("1.4.7", "minor")).toBe("1.5.0");
      });

      it("works with zero version", () => {
        expect(VersionCalculator.bump("0.0.5", "minor")).toBe("0.1.0");
      });
    });

    describe("patch", () => {
      it("increments patch", () => {
        expect(VersionCalculator.bump("1.4.7", "patch")).toBe("1.4.8");
      });

      it("works with zero version", () => {
        expect(VersionCalculator.bump("0.0.0", "patch")).toBe("0.0.1");
      });
    });
  });
});
