import { dirname } from "node:path";
import { existsSync } from "node:fs";

export async function repositoryRoot(cwd: string): Promise<string> {
  let current = cwd;

  while (true) {
    if (existsSync(`${current}/.git`)) {
      return current;
    }

    const parent = dirname(current);

    if (parent === current) {
      throw new Error("Not inside a git repository.");
    }

    current = parent;
  }
}
