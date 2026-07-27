export type VersionBump = "major" | "minor" | "patch" | "prerelease" | "none";

export const VersionBump = {
  fromString(value: string): VersionBump {
    if (
      value === "major" ||
      value === "minor" ||
      value === "patch" ||
      value === "prerelease" ||
      value === "none"
    ) {
      return value;
    }
    throw new Error(`Invalid version bump: ${value}`);
  },

  isBreaking(bump: VersionBump): boolean {
    return bump === "major";
  },

  order: {
    none: 0,
    patch: 1,
    minor: 2,
    major: 3,
    prerelease: 4,
  } as const,
};
