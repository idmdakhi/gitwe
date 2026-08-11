import { dirname } from "node:path";
import { existsSync } from "node:fs";

export async function repositoryRoot(cwd: string): Promise<string> {
  let current = cwd;

  while (current.length > 0) {
    if (existsSync(`${current}/.git`)) {
      return current;
    }

    const parent = dirname(current);

    if (parent === current) {
      break;
    }

    current = parent;
  }

  throw new Error("Not inside a git repository.");
}
