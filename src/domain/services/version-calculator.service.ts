import type { VersionBump } from "../entities/workflow-config.entity.js";
import { ValidationError } from "../errors/index.js";

export interface SemVer {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease?: string;
}

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

/** Pure semver parsing/formatting/bumping — no I/O, fully unit-testable. */
export class VersionCalculatorService {
  parse(raw: string): SemVer {
    const match = SEMVER_RE.exec(raw.trim());
    if (!match) {
      throw new ValidationError(`"${raw}" is not a valid semantic version`);
    }
    const [, major, minor, patch, prerelease] = match;
    return {
      major: Number(major),
      minor: Number(minor),
      patch: Number(patch),
      ...(prerelease ? { prerelease } : {}),
    };
  }

  format(version: SemVer, tagPrefix = ""): string {
    const core = `${version.major}.${version.minor}.${version.patch}`;
    const suffix = version.prerelease ? `-${version.prerelease}` : "";
    return `${tagPrefix}${core}${suffix}`;
  }

  bump(current: string, type: VersionBump): SemVer {
    const version = this.parse(current);
    switch (type) {
      case "major":
        return { major: version.major + 1, minor: 0, patch: 0 };
      case "minor":
        return { major: version.major, minor: version.minor + 1, patch: 0 };
      case "patch":
        return { major: version.major, minor: version.minor, patch: version.patch + 1 };
      case "prerelease": {
        const n = version.prerelease?.match(/(\d+)$/)?.[1];
        const next = n ? Number(n) + 1 : 0;
        const base = version.prerelease?.replace(/\d+$/, "") ?? "rc.";
        return { ...version, prerelease: `${base}${next}` };
      }
      case "none":
        return version;
    }
  }
}
