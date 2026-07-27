import { VersionBump } from "#gitwe/domain/valueObjects/VersionBump";

export class Version {
  constructor(
    public readonly major: number,
    public readonly minor: number,
    public readonly patch: number,
    public readonly prerelease?: string, // "beta.1"
    public readonly build?: string, // "20240727"
  ) {}

  static parse(input: string): Version {
    // Remove leading 'v' if present
    let raw = input.trim();
    if (raw.startsWith("v")) raw = raw.slice(1);

    // Split into version + prerelease + build
    let versionPart = raw;
    let prereleasePart: string | undefined;
    let buildPart: string | undefined;

    const buildIdx = raw.indexOf("+");
    if (buildIdx !== -1) {
      buildPart = raw.slice(buildIdx + 1);
      versionPart = raw.slice(0, buildIdx);
    }

    const prereleaseIdx = versionPart.indexOf("-");
    if (prereleaseIdx !== -1) {
      prereleasePart = versionPart.slice(prereleaseIdx + 1);
      versionPart = versionPart.slice(0, prereleaseIdx);
    }

    const parts = versionPart.split(".");
    if (parts.length !== 3) {
      throw new Error(`Invalid version format: ${input}. Expected X.Y.Z`);
    }

    const major = parseInt(parts[0]!, 10);
    const minor = parseInt(parts[1]!, 10);
    const patch = parseInt(parts[2]!, 10);

    if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
      throw new Error(`Invalid version numbers: ${input}`);
    }

    return new Version(major, minor, patch, prereleasePart, buildPart);
  }

  static zero(): Version {
    return new Version(0, 0, 0);
  }

  bump(kind: VersionBump, prereleaseId?: string): Version {
    if (kind === "none") return this;

    if (kind === "prerelease") {
      const id = prereleaseId ?? "beta";
      // برای prerelease، پچ را افزایش نمی‌دهیم، فقط شماره prerelease را به‌روز می‌کنیم
      const major = this.major;
      const minor = this.minor;
      const patch = this.patch;

      let nextPrerelease: string;
      const currentId = this.prerelease;
      if (currentId && currentId.startsWith(id)) {
        const parts = currentId.split(".");
        const last = parts[parts.length - 1];
        const num = parseInt(last, 10);
        if (!isNaN(num)) {
          parts[parts.length - 1] = String(num + 1);
          nextPrerelease = parts.join(".");
        } else {
          nextPrerelease = `${id}.1`;
        }
      } else {
        nextPrerelease = `${id}.1`;
      }

      return new Version(major, minor, patch, nextPrerelease, this.build);
    }

    // Reset prerelease when bumping major/minor/patch
    let major = this.major;
    let minor = this.minor;
    let patch = this.patch;

    if (kind === "major") {
      major += 1;
      minor = 0;
      patch = 0;
    } else if (kind === "minor") {
      minor += 1;
      patch = 0;
    } else if (kind === "patch") {
      patch += 1;
    }

    return new Version(major, minor, patch, undefined, this.build);
  }

  toString(prefix?: string): string {
    let base = `${this.major}.${this.minor}.${this.patch}`;
    if (this.prerelease) base += `-${this.prerelease}`;
    if (this.build) base += `+${this.build}`;
    return prefix ? `${prefix}${base}` : base;
  }

  equals(other: Version): boolean {
    return (
      this.major === other.major &&
      this.minor === other.minor &&
      this.patch === other.patch &&
      this.prerelease === other.prerelease &&
      this.build === other.build
    );
  }

  compare(other: Version): -1 | 0 | 1 {
    if (this.major !== other.major) return this.major > other.major ? 1 : -1;
    if (this.minor !== other.minor) return this.minor > other.minor ? 1 : -1;
    if (this.patch !== other.patch) return this.patch > other.patch ? 1 : -1;

    // Prerelease: presence means lower priority
    const thisHasPre = !!this.prerelease;
    const otherHasPre = !!other.prerelease;
    if (thisHasPre && !otherHasPre) return -1;
    if (!thisHasPre && otherHasPre) return 1;
    if (thisHasPre && otherHasPre) {
      // Simple string comparison for now
      if (this.prerelease! < other.prerelease!) return -1;
      if (this.prerelease! > other.prerelease!) return 1;
    }

    return 0;
  }

  isHigherThan(other: Version): boolean {
    return this.compare(other) === 1;
  }

  isPrerelease(): boolean {
    return !!this.prerelease;
  }
}
