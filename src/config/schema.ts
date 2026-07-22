import type { GitweConfig } from "#gitwe/config/types";

export function isGitweConfig(value: unknown): value is GitweConfig {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const config = value as Partial<GitweConfig>;

  return (
    typeof config.version === "number" &&
    typeof config.workflow === "string" &&
    typeof config.branches === "object" &&
    typeof config.types === "object" &&
    typeof config.merge === "object" &&
    typeof config.tag === "object" &&
    typeof config.commit === "object" &&
    typeof config.branchNaming === "object"
  );
}
