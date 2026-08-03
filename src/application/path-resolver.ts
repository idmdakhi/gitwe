import { isAbsolute, resolve } from "node:path";

export function resolvePath(root: string, path: string): string {
  if (isAbsolute(path)) {
    return path;
  }

  return resolve(root, path);
}
