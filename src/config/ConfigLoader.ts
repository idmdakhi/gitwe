import fs from "node:fs";
import path from "node:path";

import { DEFAULT_CONFIG } from "./defaults";
import { isGitweConfig } from "./schema";
import type { GitweConfig } from "./types";

export class ConfigLoader {
  constructor(private readonly cwd = process.cwd()) {}

  load(file = "gitwe.json"): GitweConfig {
    const fullPath = path.resolve(this.cwd, file);

    if (!fs.existsSync(fullPath)) {
      return DEFAULT_CONFIG;
    }

    const raw = fs.readFileSync(fullPath, "utf8");

    const json = JSON.parse(raw);

    if (!isGitweConfig(json)) {
      throw new Error("Invalid gitwe.json");
    }

    return json;
  }
}
