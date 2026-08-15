import { describe, expect, it } from "vitest";
import { VersionCalculatorService } from "../../src/domain/services/version-calculator.service.js";

describe("VersionCalculatorService", () => {
  const calc = new VersionCalculatorService();

  it("bumps minor and resets patch", () => {
    expect(calc.format(calc.bump("1.4.9", "minor"), "v")).toBe("v1.5.0");
  });

  it("bumps major and resets minor/patch", () => {
    expect(calc.format(calc.bump("1.4.9", "major"), "v")).toBe("v2.0.0");
  });

  it("bumps patch only", () => {
    expect(calc.format(calc.bump("1.4.9", "patch"), "v")).toBe("v1.4.10");
  });

  it("rejects an invalid version string", () => {
    expect(() => calc.parse("not-a-version")).toThrow();
  });
});
