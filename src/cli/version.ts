import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

/**
 * Reads the installed package's version from `package.json`, resolved
 * relative to this compiled file (`dist/cli/version.js` -> `../../package.json`)
 * so it works regardless of the consumer's current working directory.
 *
 * @internal
 */
export function readPackageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgPath = join(here, "..", "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };
  return pkg.version;
}
