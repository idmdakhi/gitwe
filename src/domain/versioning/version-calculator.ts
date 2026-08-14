export type VersionBumpType = "major" | "minor" | "patch" | "prerelease" | "none";

export interface Version {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

export class VersionCalculator {
  static parse(version: string): Version {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);

    if (!match) {
      throw new Error(`Invalid semantic version: ${version}`);
    }

    return {
      major: Number(match[1]),
      minor: Number(match[2]),
      patch: Number(match[3]),
      prerelease: match[4],
    };
  }

  static bump(version: string, type: VersionBumpType): string {
    const current = this.parse(version);

    switch (type) {
      case "major":
        return `${current.major + 1}.0.0`;
      case "minor":
        return `${current.major}.${current.minor + 1}.0`;
      case "patch":
        return `${current.major}.${current.minor}.${current.patch + 1}`;
      case "prerelease": {
        const parts = current.prerelease ? current.prerelease.split(".") : [];
        const typeName = parts[0] || "alpha";
        const number = parts.length > 1 ? parseInt(parts[1], 10) + 1 : 1;
        return `${current.major}.${current.minor}.${current.patch}-${typeName}.${number}`;
      }
      default:
        throw new Error(`Unsupported version bump type: ${type}`);
    }
  }
}
