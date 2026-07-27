import { describe, it, expect } from "vitest";
import { Version } from "#gitwe/domain/valueObjects/Version";

describe("Version", () => {
  describe("parse", () => {
    it("parses a valid semver string", () => {
      const v = Version.parse("1.2.3");
      expect(v.major).toBe(1);
      expect(v.minor).toBe(2);
      expect(v.patch).toBe(3);
      expect(v.prerelease).toBeUndefined();
      expect(v.build).toBeUndefined();
    });

    it("parses with leading 'v' prefix", () => {
      const v = Version.parse("v1.2.3");
      expect(v.major).toBe(1);
      expect(v.minor).toBe(2);
      expect(v.patch).toBe(3);
    });

    it("parses with prerelease", () => {
      const v = Version.parse("1.2.3-beta.1");
      expect(v.prerelease).toBe("beta.1");
    });

    it("parses with build metadata", () => {
      const v = Version.parse("1.2.3+20240727");
      expect(v.build).toBe("20240727");
    });

    it("parses with prerelease and build", () => {
      const v = Version.parse("1.2.3-beta.1+20240727");
      expect(v.prerelease).toBe("beta.1");
      expect(v.build).toBe("20240727");
    });

    it("throws on invalid format", () => {
      expect(() => Version.parse("1.2")).toThrow(/Invalid version/);
      expect(() => Version.parse("1.2.a")).toThrow(/Invalid version/);
      expect(() => Version.parse("")).toThrow(/Invalid version/);
    });
  });

  describe("bump", () => {
    it("bumps patch", () => {
      const v = Version.parse("1.2.3");
      const bumped = v.bump("patch");
      expect(bumped.toString()).toBe("1.2.4");
    });

    it("bumps minor", () => {
      const v = Version.parse("1.2.3");
      const bumped = v.bump("minor");
      expect(bumped.toString()).toBe("1.3.0");
    });

    it("bumps major", () => {
      const v = Version.parse("1.2.3");
      const bumped = v.bump("major");
      expect(bumped.toString()).toBe("2.0.0");
    });

    it("bumps prerelease from stable", () => {
      const v = Version.parse("1.2.3");
      const bumped = v.bump("prerelease", "beta");
      expect(bumped.toString()).toBe("1.2.4-beta.1");
    });

    it("increments prerelease number", () => {
      const v = Version.parse("1.2.3-beta.1");
      const bumped = v.bump("prerelease", "beta");
      expect(bumped.toString()).toBe("1.2.3-beta.2");
    });

    it("switches prerelease id", () => {
      const v = Version.parse("1.2.3-beta.1");
      const bumped = v.bump("prerelease", "alpha");
      expect(bumped.toString()).toBe("1.2.3-alpha.1");
    });

    it("resets prerelease on major bump", () => {
      const v = Version.parse("1.2.3-beta.1");
      const bumped = v.bump("major");
      expect(bumped.toString()).toBe("2.0.0");
      expect(bumped.prerelease).toBeUndefined();
    });

    it("resets prerelease on minor bump", () => {
      const v = Version.parse("1.2.3-beta.1");
      const bumped = v.bump("minor");
      expect(bumped.toString()).toBe("1.3.0");
      expect(bumped.prerelease).toBeUndefined();
    });

    it("resets prerelease on patch bump", () => {
      const v = Version.parse("1.2.3-beta.1");
      const bumped = v.bump("patch");
      expect(bumped.toString()).toBe("1.2.4");
      expect(bumped.prerelease).toBeUndefined();
    });

    it("handles 'none' bump", () => {
      const v = Version.parse("1.2.3");
      const bumped = v.bump("none");
      expect(bumped.toString()).toBe("1.2.3");
    });
  });

  describe("toString", () => {
    it("formats without prefix", () => {
      const v = new Version(1, 2, 3);
      expect(v.toString()).toBe("1.2.3");
    });

    it("formats with prefix", () => {
      const v = new Version(1, 2, 3);
      expect(v.toString("v")).toBe("v1.2.3");
    });

    it("formats with prerelease", () => {
      const v = new Version(1, 2, 3, "beta.1");
      expect(v.toString()).toBe("1.2.3-beta.1");
    });

    it("formats with build", () => {
      const v = new Version(1, 2, 3, undefined, "20240727");
      expect(v.toString()).toBe("1.2.3+20240727");
    });
  });

  describe("compare", () => {
    it("returns 0 for equal versions", () => {
      const a = Version.parse("1.2.3");
      const b = Version.parse("1.2.3");
      expect(a.compare(b)).toBe(0);
    });

    it("returns 1 for higher major", () => {
      const a = Version.parse("2.0.0");
      const b = Version.parse("1.9.9");
      expect(a.compare(b)).toBe(1);
    });

    it("returns -1 for lower major", () => {
      const a = Version.parse("1.9.9");
      const b = Version.parse("2.0.0");
      expect(a.compare(b)).toBe(-1);
    });

    it("compares minor correctly", () => {
      const a = Version.parse("1.2.0");
      const b = Version.parse("1.1.9");
      expect(a.compare(b)).toBe(1);
    });

    it("compares patch correctly", () => {
      const a = Version.parse("1.2.3");
      const b = Version.parse("1.2.2");
      expect(a.compare(b)).toBe(1);
    });

    it("prerelease has lower priority than stable", () => {
      const a = Version.parse("1.2.3-alpha.1");
      const b = Version.parse("1.2.3");
      expect(a.compare(b)).toBe(-1);
      expect(b.compare(a)).toBe(1);
    });

    it("compares prerelease versions", () => {
      const a = Version.parse("1.2.3-alpha.1");
      const b = Version.parse("1.2.3-alpha.2");
      expect(a.compare(b)).toBe(-1);
      expect(b.compare(a)).toBe(1);
    });

    it("compares different prerelease ids", () => {
      const a = Version.parse("1.2.3-alpha.1");
      const b = Version.parse("1.2.3-beta.1");
      expect(a.compare(b)).toBe(-1);
      expect(b.compare(a)).toBe(1);
    });
  });

  describe("isHigherThan", () => {
    it("returns true when higher", () => {
      const a = Version.parse("2.0.0");
      const b = Version.parse("1.0.0");
      expect(a.isHigherThan(b)).toBe(true);
    });

    it("returns false when lower", () => {
      const a = Version.parse("1.0.0");
      const b = Version.parse("2.0.0");
      expect(a.isHigherThan(b)).toBe(false);
    });

    it("returns false when equal", () => {
      const a = Version.parse("1.2.3");
      const b = Version.parse("1.2.3");
      expect(a.isHigherThan(b)).toBe(false);
    });
  });

  describe("isPrerelease", () => {
    it("returns true for prerelease", () => {
      const v = Version.parse("1.2.3-beta.1");
      expect(v.isPrerelease()).toBe(true);
    });

    it("returns false for stable", () => {
      const v = Version.parse("1.2.3");
      expect(v.isPrerelease()).toBe(false);
    });
  });

  describe("zero", () => {
    it("returns 0.0.0", () => {
      const v = Version.zero();
      expect(v.toString()).toBe("0.0.0");
    });
  });
});
