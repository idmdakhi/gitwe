import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The package version, read from `package.json` at runtime.
 *
 * `src/version.ts` (development/tests) and `dist/version.js` (published build)
 * both live one directory below the package root, so `../package.json` always
 * resolves correctly — including inside `node_modules/gitwe/`.
 */

export function getVersion(): string {
  const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };

  return pkg.version;
}
